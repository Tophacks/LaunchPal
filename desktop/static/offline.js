(function () {
  const url = new URLSearchParams(location.search).get("url") || "http://localhost:3000";
  document.getElementById("url").textContent = url;
  document.getElementById("retry").addEventListener("click", () => location.replace(url));
})();
