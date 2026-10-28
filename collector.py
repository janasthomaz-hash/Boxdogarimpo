#!/usr/bin/env python3
"""Controlled product collection for O Garimpo.

Does not publish offers or fabricate affiliate URLs. Preserves existing spreadsheet
tabs and appends audit events. Secrets and tokens are never printed.
"""
from __future__ import annotations
import hashlib, json, os, sys, uuid
from datetime import datetime, timezone
from typing import Any
import requests
from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build

SCOPES = ["https://www.googleapis.com/auth/spreadsheets"]
API = "https://api.mercadolibre.com"
RUN_ID = "GH_" + uuid.uuid4().hex[:12].upper()
NOW = datetime.now(timezone.utc).isoformat(timespec="seconds")
HEADERS = {
 "CONFIG": ["CHAVE","VALOR","TIPO","DESCRICAO","ULTIMA_ATUALIZACAO"],
 "OFERTAS": ["MLB_ID","HASH_ESTAVEL","TITULO","CATEGORIA","PRECO_ATUAL","PRECO_ORIGINAL","DESCONTO_PCT","SCORE_OPORTUNIDADE","LINK_AFILIADO_VALIDADO","STATUS_ATUAL","REPUTACAO_VENDEDOR","FRETE_GRATIS","DATA_COLETA","DATA_PUBLICACAO"],
 "HISTORICO": ["ID_EVENTO","MLB_ID","PRECO_REGISTRADO","PRECO_ANTERIOR","VARIACAO_PCT","TIPO_EVENTO","DATA_HORA","OBSERVACOES"],
 "CANAIS": ["CANAL_ID","NOME_CANAL","DESTINO","STATUS_CONEXAO","AUTORIZADO_PUBLICAR","ULTIMO_TESTE_DATA","RESULTADO_TESTE"],
 "LOGS": ["EXECUCAO_ID","TIMESTAMP","MODULO","NIVEL","CREDITOS_MAKE","MENSAGEM","DETALHES_JSON"],
}

def log(level: str, message: str, details: dict[str, Any] | None = None) -> None:
    print(json.dumps({"run_id":RUN_ID,"timestamp":NOW,"level":level,"message":message,"details":details or {}}, ensure_ascii=False))

def env(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value:
        raise RuntimeError(f"Secret obrigatório ausente: {name}")
    return value

def sheets_service():
    try:
        info = json.loads(env("GCP_SA_CREDENTIALS"))
    except json.JSONDecodeError as exc:
        raise RuntimeError("GCP_SA_CREDENTIALS não contém JSON válido.") from exc
    creds = Credentials.from_service_account_info(info, scopes=SCOPES)
    return build("sheets", "v4", credentials=creds, cache_discovery=False)

def ensure_tabs(service, spreadsheet_id: str) -> None:
    meta = service.spreadsheets().get(spreadsheetId=spreadsheet_id, fields="sheets.properties(title)").execute()
    existing = {s["properties"]["title"] for s in meta.get("sheets", [])}
    missing = [name for name in HEADERS if name not in existing]
    if missing:
        # Add only missing tabs; never delete, rename, or write to legacy Página1.
        service.spreadsheets().batchUpdate(
            spreadsheetId=spreadsheet_id,
            body={"requests":[{"addSheet":{"properties":{"title":name}}} for name in missing]}
        ).execute()
        log("INFO", "Abas ausentes criadas de forma idempotente.", {"created_tabs":missing})
    for name, headers in HEADERS.items():
        values = service.spreadsheets().values().get(
            spreadsheetId=spreadsheet_id, range=f"'{name}'!A1:Z1"
        ).execute().get("values", [])
        if not values or not any(str(v).strip() for v in values[0]):
            service.spreadsheets().values().update(
                spreadsheetId=spreadsheet_id, range=f"'{name}'!A1",
                valueInputOption="RAW", body={"values":[headers]}
            ).execute()

def read_config(service, spreadsheet_id: str) -> dict[str,str]:
    rows = service.spreadsheets().values().get(
        spreadsheetId=spreadsheet_id, range="'CONFIG'!A2:B200"
    ).execute().get("values", [])
    return {str(r[0]).strip().upper():str(r[1]).strip() for r in rows if len(r)>1 and str(r[0]).strip()}

def access_token() -> str:
    response = requests.post(API + "/oauth/token", data={
        "grant_type":"refresh_token", "client_id":env("MELI_APP_ID"),
        "client_secret":env("MELI_SECRET_KEY"), "refresh_token":env("MELI_REFRESH_TOKEN")
    }, headers={"Accept":"application/json"}, timeout=(10,30))
    if not response.ok:
        raise RuntimeError(f"OAuth Mercado Livre falhou com HTTP {response.status_code}.")
    token = response.json().get("access_token")
    if not token:
        raise RuntimeError("OAuth não retornou access_token.")
    return token

def search_products(token: str, query: str, limit: int) -> list[dict[str,Any]]:
    response = requests.get(API + "/sites/MLB/search", params={"q":query,"limit":min(max(limit,1),50)},
        headers={"Authorization":"Bearer " + token,"Accept":"application/json"}, timeout=(10,30))
    if not response.ok:
        raise RuntimeError(f"Pesquisa Mercado Livre respondeu HTTP {response.status_code}; verifique acesso, endpoint e políticas oficiais.")
    results = response.json().get("results")
    if not isinstance(results, list):
        raise RuntimeError("Resposta de pesquisa sem lista results.")
    return results

def price_value(item: dict[str,Any], key: str):
    v = item.get(key)
    return round(float(v),2) if isinstance(v,(int,float)) else ""

def stable_hash(item_id: str, title: str) -> str:
    return hashlib.sha256((item_id+"|"+title.strip().lower()).encode()).hexdigest()

def read_offers(service, spreadsheet_id: str) -> dict[str,tuple[int,list[Any]]]:
    rows = service.spreadsheets().values().get(
        spreadsheetId=spreadsheet_id, range="'OFERTAS'!A2:N"
    ).execute().get("values", [])
    return {str(row[0]):(i,row) for i,row in enumerate(rows,start=2) if row and row[0]}

def write_log(service, spreadsheet_id: str, level: str, message: str, details: dict[str,Any]):
    row = [RUN_ID,NOW,"collector.py",level,0,message,json.dumps(details,ensure_ascii=False)[:45000]]
    service.spreadsheets().values().append(
        spreadsheetId=spreadsheet_id, range="'LOGS'!A:G", valueInputOption="RAW",
        insertDataOption="INSERT_ROWS", body={"values":[row]}
    ).execute()

def save_products(service, spreadsheet_id: str, products: list[dict[str,Any]]) -> dict[str,int]:
    existing = read_offers(service, spreadsheet_id)
    new_rows, history = [], []
    updates, valid = [], 0
    for item in products:
        item_id, title = str(item.get("id") or "").strip(), str(item.get("title") or "").strip()
        if not item_id or not title:
            continue
        price, original = price_value(item,"price"), price_value(item,"original_price")
        discount = round(max(0.0,(original-price)/original*100),2) if isinstance(price,(int,float)) and isinstance(original,(int,float)) and original>0 else ""
        stamp = datetime.now(timezone.utc).isoformat(timespec="seconds")
        # Public permalink is intentionally not copied into the affiliate-link field.
        row = [item_id,stable_hash(item_id,title),title,str(item.get("category_id") or ""),
            price,original,discount,"","","COLETADO_PENDENTE_VALIDACAO","","",stamp,""]
        if item_id in existing:
            row_num, old = existing[item_id]
            old_price = old[4] if len(old)>4 else ""
            price_changed = str(old_price) != str(price)
            # Preserve manually validated metadata. If price changes, force revalidation
            # but keep the affiliate URL for later re-check instead of silently deleting it.
            for idx in (7, 8, 10, 11, 13):
                if len(old) > idx and old[idx] not in (None, ""):
                    row[idx] = old[idx]
            if len(old) > 9 and old[9]:
                row[9] = "COLETADO_PENDENTE_VALIDACAO" if price_changed else old[9]
            if price_changed:
                variation = ""
                try:
                    old_num,new_num=float(old_price),float(price)
                    if old_num: variation=round((new_num-old_num)/old_num*100,2)
                except (TypeError,ValueError): pass
                history.append([f"HIST_{uuid.uuid4().hex[:10].upper()}",item_id,price,old_price,variation,"ALTERACAO_PRECO",stamp,"Preço alterado; oferta marcada para nova validação."])
            updates.append((row_num,row))
        else:
            new_rows.append(row)
            history.append([f"HIST_{uuid.uuid4().hex[:10].upper()}",item_id,price,"","","PRIMEIRA_COLETA",stamp,"Novo item; não aprovado para publicação."])
        valid += 1
    for row_num,row in updates:
        service.spreadsheets().values().update(spreadsheetId=spreadsheet_id,range=f"'OFERTAS'!A{row_num}:N{row_num}",valueInputOption="RAW",body={"values":[row]}).execute()
    if new_rows:
        service.spreadsheets().values().append(spreadsheetId=spreadsheet_id,range="'OFERTAS'!A:N",valueInputOption="RAW",insertDataOption="INSERT_ROWS",body={"values":new_rows}).execute()
    if history:
        service.spreadsheets().values().append(spreadsheetId=spreadsheet_id,range="'HISTORICO'!A:H",valueInputOption="RAW",insertDataOption="INSERT_ROWS",body={"values":history}).execute()
    return {"valid_items":valid,"new_items":len(new_rows),"updated_items":len(updates),"history_events":len(history)}

def main() -> int:
    spreadsheet_id, service = "", None
    try:
        spreadsheet_id = env("SPREADSHEET_ID")
        service = sheets_service()
        ensure_tabs(service, spreadsheet_id)
        config = read_config(service, spreadsheet_id)
        query = config.get("MELI_SEARCH_QUERY","ofertas")
        try: limit = int(config.get("MAX_ITENS_COLETA","20"))
        except ValueError: limit = 20
        limit = min(max(limit,1),50)
        log("INFO","Iniciando coleta.",{"query":query,"limit":limit})
        products = search_products(access_token(),query,limit)
        summary = save_products(service,spreadsheet_id,products)
        summary.update({"query":query,"returned_by_api":len(products)})
        write_log(service,spreadsheet_id,"INFO","Coleta concluída; ofertas aguardam validação.",summary)
        log("INFO","Coleta concluída.",summary)
        return 0
    except Exception as exc:
        message = str(exc)[:1000]
        log("ERROR",message)
        if service and spreadsheet_id:
            try: write_log(service,spreadsheet_id,"ERROR",message,{"run_id":RUN_ID})
            except Exception as log_exc: log("ERROR","Falha ao gravar LOGS.",{"exception_type":type(log_exc).__name__})
        return 1

if __name__ == "__main__":
    sys.exit(main())
