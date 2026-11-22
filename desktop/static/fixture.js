// Dev-only fake installer: shows screenshot fixtures full-screen; each click advances to the next one.
(function () {
  const files = JSON.parse(new URLSearchParams(location.search).get("files") || "[]");
  const imgs = files.map((src, i) => {
    const img = document.createElement("img");
    img.src = src;
    if (i === 0) img.className = "on";
    document.body.appendChild(img);
    return img;
  });
  let i = 0;
  window.nextFixture = () => {
    if (!imgs.length) return;
    imgs[i].className = "";
    i = Math.min(i + 1, imgs.length - 1);
    imgs[i].className = "on";
  };
  document.body.addEventListener("click", window.nextFixture);
})();
