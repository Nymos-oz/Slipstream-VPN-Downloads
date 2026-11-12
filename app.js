(() => {
  for (const element of document.querySelectorAll("[data-current-year]")) {
    element.textContent = String(new Date().getFullYear());
  }

  const platforms = {
    android: {
      link: "android-download",
      status: "android-status",
      badge: "android-badge",
      version: "android-version",
      size: "android-size",
      match: asset => /^SlipstreamVPN-[\d.]+\.apk$/i.test(asset.name)
    }
  };

  if (!document.getElementById(platforms.android.link)) return;

  const releaseRepository = "Nymos-oz/Slipstream-VPN-Downloads";
  const releasesUrl = `https://github.com/${releaseRepository}/releases/latest`;

  const formatSize = bytes => {
    if (!Number.isFinite(bytes) || bytes <= 0) return "";
    const units = ["Б", "КБ", "МБ", "ГБ"];
    let value = bytes;
    let unit = 0;
    while (value >= 1024 && unit < units.length - 1) {
      value /= 1024;
      unit += 1;
    }
    return `${value.toLocaleString("ru-RU", { maximumFractionDigits: 1 })} ${units[unit]}`;
  };

  const showUnavailable = message => {
    const view = platforms.android;
    const link = document.getElementById(view.link);
    link.href = releasesUrl;
    link.textContent = "Открыть релизы GitHub";
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    document.getElementById(view.status).textContent = message;
    document.getElementById(view.badge).textContent = "Android 8.0+";
  };

  const showAsset = (platform, asset, version) => {
    const view = platforms[platform];
    const downloadUrl = new URL(asset.browser_download_url);
    if (downloadUrl.protocol !== "https:" || downloadUrl.hostname !== "github.com") {
      showUnavailable("Ссылка загрузки не прошла проверку безопасности.");
      return;
    }
    const link = document.getElementById(view.link);
    link.href = downloadUrl.href;
    link.removeAttribute("target");
    link.removeAttribute("rel");
    link.setAttribute("download", asset.name);
    link.textContent = `Скачать ${formatSize(asset.size)}`.trim();
    document.getElementById(view.status).textContent =
      `Официальный релиз ${version}. Файл загружается с GitHub.`;
    document.getElementById(view.badge).textContent = version;
    document.getElementById(view.badge).classList.add("badge-live");
    document.getElementById(view.version).textContent = `Версия ${version}`;
    document.getElementById(view.size).textContent = formatSize(asset.size);

    if (platform === "android" && /^sha256:[a-f0-9]{64}$/i.test(asset.digest || "")) {
      const checksum = asset.digest.slice("sha256:".length).toLowerCase();
      const checksumPanel = document.getElementById("android-checksum");
      const checksumValue = document.getElementById("android-sha256");
      const copyButton = document.getElementById("android-sha256-copy");
      const copyStatus = document.getElementById("android-sha256-status");
      checksumValue.textContent = checksum;
      checksumPanel.hidden = false;
      copyButton.addEventListener("click", async () => {
        try {
          if (!navigator.clipboard) throw new Error("Clipboard API unavailable");
          await navigator.clipboard.writeText(checksum);
          copyStatus.textContent = "SHA-256 скопирован.";
        } catch {
          copyStatus.textContent = "Не удалось скопировать. Выделите и скопируйте хеш выше.";
        }
      });
    }
  };

  fetch(`https://api.github.com/repos/${releaseRepository}/releases/latest`, {
    headers: { Accept: "application/vnd.github+json" },
    cache: "no-store"
  })
    .then(response => {
      if (!response.ok) throw new Error(response.status === 404 ? "not-found" : "unavailable");
      return response.json();
    })
    .then(release => {
      if (release.draft || release.prerelease) throw new Error("not-found");
      const version = (release.tag_name || "").replace(/^v/i, "");
      const assets = Array.isArray(release.assets) ? release.assets : [];
      for (const [platform, view] of Object.entries(platforms)) {
        const asset = assets.find(view.match);
        if (asset) {
          showAsset(platform, asset, version || "Последняя версия");
        } else {
          showUnavailable("APK пока не прикреплён к последнему публичному релизу.");
        }
      }
    })
    .catch(error => {
      const message = error.message === "not-found"
        ? "Публичный стабильный релиз пока недоступен. Проверьте страницу релизов позже."
        : "Не удалось проверить релиз. Можно открыть страницу загрузок GitHub.";
      showUnavailable(message);
    });
})();
