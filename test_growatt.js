document.addEventListener("DOMContentLoaded", () => {
  async function loadSolarStats() {
    try {
      const res = await fetch(
        "https://api.highdatamx.com/api/v1/growatt/stats"
      );
      const data = await res.json();

      animateCount("total_energy", data.total_energy, 1200, 2, " kWh");
      animateCount("current_power", data.current_power, 1000, 0, " W");
      animateCount("peak_power", data.peak_power, 1000, 0, " W");
      animateCount("percentage", data.percentage, 1000, 1, " %");
    } catch (err) {
      console.error("Error al cargar datos solares:", err);
      const fields = [
        "total_energy",
        "current_power",
        "peak_power",
        "percentage",
      ];
      fields.forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.textContent = "Error";
      });
    }
  }

  function animateCount(
    id,
    endValue,
    duration = 1000,
    decimals = 0,
    suffix = ""
  ) {
    const el = document.getElementById(id);
    if (!el) return;

    const startTime = performance.now();
    const startValue = 0;

    function update(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const value = startValue + (endValue - startValue) * progress;

      el.textContent =
        value.toLocaleString(undefined, {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        }) + suffix;

      if (progress < 1) {
        requestAnimationFrame(update);
      }
    }

    requestAnimationFrame(update);
  }

  loadSolarStats();
  setInterval(loadSolarStats, 60000); // actualiza cada minuto
});
