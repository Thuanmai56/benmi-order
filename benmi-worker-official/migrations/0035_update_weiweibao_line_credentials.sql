-- Migration: 0035_update_weiweibao_line_credentials.sql
-- Description: Update official LINE Channel Token, LIFF ID, and LIFF URL for tenant 'weiweibao' (微為飽小吃)

UPDATE tenant_config 
SET 
    line_channel_token = 'fvt+rA3Gp5Lm03qcaEsuXiwkV/N4DPeHJh4IMvGFNeSLkHpceE8FPcX6FosaLlH7J5bIM+CPsx8BSGESyfDw8SUmlL0V0Tcp/EcTllbh8RC6ndV1QYmy82VQEUzl7Ghh29PCQWOZQx16xQkxW5zVegdB04t89/1O/w1cDnyilFU=',
    liff_id = '2011217565-q5JOlua3',
    liff_url = 'https://liff.line.me/2011217565-q5JOlua3',
    updated_at = CURRENT_TIMESTAMP
WHERE tenant_id = 'weiweibao';
