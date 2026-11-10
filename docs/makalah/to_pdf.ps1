$w = New-Object -ComObject Word.Application
$w.Visible = $false
$w.DisplayAlerts = 0
$d = $w.Documents.Open('E:\ProjekSainsData\ChatbotUMKM\docs\makalah\Makalah_Chatbot_UMKM_Kelompok3_2026.docx', $false, $true)
$d.SaveAs([ref]'E:\ProjekSainsData\ChatbotUMKM\docs\makalah\Makalah_Chatbot_UMKM_Kelompok3_2026.pdf', [ref]17)
$d.Close($false)
$w.Quit()
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($w) | Out-Null
Write-Output "PDF written"
