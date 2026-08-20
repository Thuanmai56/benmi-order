-- Migration: 0019_update_zhadan_line_credentials.sql
-- Description: Update LINE channel access token and LIFF URL for tenant 'zhadantongxue'

UPDATE tenant_config 
SET 
    line_channel_token = 'J6Q8An14F4XKtpgloLIeT/nsFjPX1ePZZkkxyCzICFU+iGHmtV7fLDyS3RR1GkqnJGy6l0/xjapX9PT/znTkCbSR/68fxDS7q3TxT5ibpOl13Yxp2pmZSX9AFK9QMJu6cPT8QtwOmI4LZz1+gpNtDwdB04t89/1O/w1cDnyilFU=',
    liff_id = '2011142254-XRns8O0k',
    liff_url = 'https://liff.line.me/2011142254-XRns8O0k',
    updated_at = CURRENT_TIMESTAMP
WHERE tenant_id = 'zhadantongxue';
