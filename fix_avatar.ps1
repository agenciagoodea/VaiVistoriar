$filePath = "d:\wamp64\www\VaiVistoriar\VaiVistoriar\pages\UsersPage.tsx"
$content = Get-Content $filePath -Raw -Encoding UTF8

# Pattern to find and replace
$oldPattern = [regex]::Escape('<div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-black text-[10px] text-slate-500 overflow-hidden">`n                                     {u.avatar_url ? (`n                                         <img src={u.avatar_url} alt={u.full_name} className="w-full h-full object-cover" />`n                                     ) : (`n                                        <span className="material-symbols-outlined text-slate-400 text-[24px]">person</span>`n                                     )}`n                                  </div>')

$newContent = @'
<div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-black text-[10px] text-slate-500 overflow-hidden relative">
                                     {u.avatar_url ? (
                                         <img src={u.avatar_url} alt={u.full_name} className="w-full h-full object-cover" />
                                     ) : (
                                        <span className="material-symbols-outlined text-slate-400 text-[24px]">person</span>
                                     )}
                                  </div>
'@

$content = $content -replace $oldPattern, $newContent
Set-Content $filePath -Value $content -Encoding UTF8 -NoNewline

Write-Host "Avatar code updated successfully!"
