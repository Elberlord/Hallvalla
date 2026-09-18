param(
  [switch]$DebugStage
)

$ErrorActionPreference = 'Stop'
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$WebRoot = (Resolve-Path (Join-Path $RepoRoot 'web')).Path

$source = @'
using System;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using System.Collections.Generic;

public sealed class HallVallaStaticServer {
    private readonly string root;
    private readonly TcpListener listener;
    private volatile bool running = true;

    public HallVallaStaticServer(string rootPath, int port) {
        root = Path.GetFullPath(rootPath);
        listener = new TcpListener(IPAddress.Loopback, port);
    }

    public void Start() {
        listener.Start();
        while (running) {
            TcpClient client = null;
            try { client = listener.AcceptTcpClient(); }
            catch { if (!running) break; else continue; }
            var captured = client;
            Task.Run(() => Handle(captured));
        }
    }

    public void Stop() {
        running = false;
        try { listener.Stop(); } catch { }
    }

    static string Mime(string path) {
        string ext = Path.GetExtension(path).ToLowerInvariant();
        switch(ext) {
            case ".html": case ".htm": return "text/html; charset=utf-8";
            case ".js": case ".mjs": return "text/javascript; charset=utf-8";
            case ".css": return "text/css; charset=utf-8";
            case ".json": return "application/json; charset=utf-8";
            case ".txt": case ".md": return "text/plain; charset=utf-8";
            case ".svg": return "image/svg+xml";
            case ".png": return "image/png";
            case ".jpg": case ".jpeg": return "image/jpeg";
            case ".webp": return "image/webp";
            case ".gif": return "image/gif";
            case ".ico": return "image/x-icon";
            case ".mp3": return "audio/mpeg";
            case ".ogg": return "audio/ogg";
            case ".wav": return "audio/wav";
            case ".woff": return "font/woff";
            case ".woff2": return "font/woff2";
            case ".ttf": return "font/ttf";
            case ".wasm": return "application/wasm";
            default: return "application/octet-stream";
        }
    }

    void Handle(TcpClient client) {
        using (client) {
            client.NoDelay = true;
            NetworkStream ns = null;
            try {
                ns = client.GetStream();
                var reader = new StreamReader(ns, Encoding.ASCII, false, 8192, true);
                string requestLine = reader.ReadLine();
                if (String.IsNullOrWhiteSpace(requestLine)) return;
                string line;
                do { line = reader.ReadLine(); } while (line != null && line.Length > 0);

                string[] parts = requestLine.Split(' ');
                if (parts.Length < 2) { WriteError(ns, 400, "Bad Request"); return; }
                string method = parts[0].ToUpperInvariant();
                if (method != "GET" && method != "HEAD") { WriteError(ns, 405, "Method Not Allowed"); return; }

                string raw = parts[1];
                int q = raw.IndexOf('?'); if (q >= 0) raw = raw.Substring(0, q);
                int h = raw.IndexOf('#'); if (h >= 0) raw = raw.Substring(0, h);
                raw = Uri.UnescapeDataString(raw.Replace('+', ' '));
                raw = raw.TrimStart('/').Replace('/', Path.DirectorySeparatorChar);
                if (String.IsNullOrEmpty(raw)) raw = "index.html";

                string full = Path.GetFullPath(Path.Combine(root, raw));
                if (!full.StartsWith(root, StringComparison.OrdinalIgnoreCase)) { WriteError(ns, 403, "Forbidden"); return; }
                if (Directory.Exists(full)) full = Path.Combine(full, "index.html");
                if (!File.Exists(full)) { WriteError(ns, 404, "Not Found"); return; }

                var fi = new FileInfo(full);
                var head = new StringBuilder();
                head.Append("HTTP/1.1 200 OK\r\n");
                head.Append("Content-Type: ").Append(Mime(full)).Append("\r\n");
                head.Append("Content-Length: ").Append(fi.Length).Append("\r\n");
                head.Append("Cache-Control: no-store, no-cache, must-revalidate, max-age=0\r\n");
                head.Append("Pragma: no-cache\r\n");
                head.Append("Expires: 0\r\n");
                head.Append("Connection: close\r\n\r\n");
                byte[] hb = Encoding.ASCII.GetBytes(head.ToString());
                ns.Write(hb, 0, hb.Length);
                if (method == "HEAD") return;

                using (var fs = new FileStream(full, FileMode.Open, FileAccess.Read, FileShare.Read, 1024 * 128, FileOptions.SequentialScan)) {
                    fs.CopyTo(ns, 1024 * 128);
                }
            } catch { }
            finally { try { if (ns != null) ns.Flush(); } catch { } }
        }
    }

    static void WriteError(NetworkStream ns, int code, string text) {
        string body = code + " " + text;
        byte[] bb = Encoding.UTF8.GetBytes(body);
        string headers = "HTTP/1.1 " + code + " " + text + "\r\nContent-Type: text/plain; charset=utf-8\r\nContent-Length: " + bb.Length + "\r\nConnection: close\r\n\r\n";
        byte[] hb = Encoding.ASCII.GetBytes(headers);
        ns.Write(hb, 0, hb.Length); ns.Write(bb, 0, bb.Length);
    }
}
'@

if (-not ('HallVallaStaticServer' -as [type])) {
  Add-Type -TypeDefinition $source -Language CSharp
}

$port = $null
for ($p = 8765; $p -le 8785; $p++) {
  try {
    $probe = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Loopback, $p)
    $probe.Start(); $probe.Stop(); $port = $p; break
  } catch { }
}
if (-not $port) { throw 'No se encontro un puerto local libre entre 8765 y 8785.' }

$url = "http://localhost:$port/"
if ($DebugStage) { $url += '?hvstageDebug=1' }

Clear-Host
Write-Host ''
Write-Host ' HallValla v181 - Design Stage local 1920x1080' -ForegroundColor Yellow
Write-Host ' ------------------------------------------------' -ForegroundColor DarkYellow
Write-Host " Carpeta web: $WebRoot"
Write-Host " URL:         $url"
Write-Host ''
Write-Host ' NO CIERRES ESTA VENTANA mientras pruebes HallValla.' -ForegroundColor Cyan
Write-Host ' Para terminar: cierra esta ventana o pulsa Ctrl+C.' -ForegroundColor DarkGray
Write-Host ''

$server = New-Object HallVallaStaticServer($WebRoot, $port)
Start-Process $url
try { $server.Start() }
finally { $server.Stop() }
