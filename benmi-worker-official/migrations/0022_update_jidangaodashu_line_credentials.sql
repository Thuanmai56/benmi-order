-- Migration: 0022_update_jidangaodashu_line_credentials.sql
-- Description: Update LINE channel access token and LIFF URL for tenant 'jidangaodashu' (雞蛋糕大叔)

UPDATE tenant_config 
SET 
    line_channel_token = 'KyHoSTu1C1Qd7wAxmr38pnRF7RQnfBHeVMXnHGC95beqyYnmFTRHTuvmsqjItonRQxEQDJIayqUJMYowUc/UpOA4ZTDT6JOBKfiGZuMrHQEeUNi3kzHKDLTyVQGJRUl6hN9FargDtpeeMYVBABqCugdB04t89/1O/w1cDnyilFU=',
    liff_id = '2011183258-TRvrkNYF',
    liff_url = 'https://liff.line.me/2011183258-TRvrkNYF',
    updated_at = CURRENT_TIMESTAMP
WHERE tenant_id = 'jidangaodashu';
