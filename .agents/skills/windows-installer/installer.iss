; ─────────────────────────────────────────────────────────────────
; installer.iss — Inno Setup скрипт для AR Overlay
; 
; Использование:
;   1. Заменить <<APP_VERSION>> на актуальную версию (например, 1.0.0)
;   2. Заменить пути к исходным файлам (Source: ...)
;   3. Inno Setup Compiler → File → Open → installer.iss → Build → Compile
; 
; Результат: Output/AR_Overlay_Setup.exe
; ─────────────────────────────────────────────────────────────────

#define AppName "AR Overlay"
#define AppVersion "<<APP_VERSION>>"
#define AppPublisher "Battle for Respect"
#define AppURL "http://localhost:3001"
#define AppExeName "AR_Overlay_Server.exe"

[Setup]
AppId={{A3F5C8D1-6B2E-4A9F-8C7D-1E5F3A2B9C4D}
AppName={#AppName}
AppVersion={#AppVersion}
AppPublisher={#AppPublisher}
DefaultDirName={autopf}\{#AppName}
DefaultGroupName={#AppName}
AllowNoIcons=yes
OutputDir=Output
OutputBaseFilename=AR_Overlay_Setup
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
; Требуем права администратора для установки службы
PrivilegesRequired=admin
; Поддержка 64-битных систем
ArchitecturesInstallIn64BitMode=x64compatible
ArchitecturesAllowed=x64compatible

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"
Name: "russian"; MessagesFile: "compiler:Languages\Russian.isl"

[Files]
; Основной исполняемый файл (сборка pkg + esbuild)
Source: "build\AR_Overlay_Server.exe"; DestDir: "{app}"; Flags: ignoreversion

; Статические файлы фронтенда
Source: "dist\*"; DestDir: "{app}\dist"; Flags: ignoreversion recursesubdirs

; nssm.exe для управления службами
Source: "tools\nssm.exe"; DestDir: "{app}"; Flags: ignoreversion

; Скрипты установки/удаления службы
Source: "install-service.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "uninstall-service.bat"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\{#AppName} Admin Panel"; Filename: "http://localhost:3001/admin"
Name: "{group}\Uninstall {#AppName}"; Filename: "{uninstallexe}"

[Run]
; Установка и запуск Windows-службы
Filename: "{app}\install-service.bat"; Parameters: """{app}"""; Flags: runhidden waituntilterminated

[UninstallRun]
; Остановка и удаление службы перед удалением файлов
Filename: "{app}\uninstall-service.bat"; Parameters: """{app}"""; Flags: runhidden waituntilterminated

[UninstallDelete]
; Удаляем .data директорию? Раскомментируй, если нужно сбрасывать состояние при переустановке
; Type: filesandordirs; Name: "{app}\.data"

[Code]
// Показываем ссылку на админку после установки
procedure CurStepChanged(CurStep: TSetupStep);
begin
  if CurStep = ssPostInstall then
  begin
    MsgBox('AR Overlay установлен и запущен как служба.' + #13#10 +
           'Админ-панель: http://localhost:3001/admin' + #13#10 +
           'Оверлей для OBS: http://localhost:3001/overlay', mbInformation, MB_OK);
  end;
end;
