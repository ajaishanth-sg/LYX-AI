import { useEffect, useState } from "react";

export function useWeather() {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchWeather = async (lat, lon) => {
      try {
        // wttr.in — free, no API key needed, CORS-friendly
        const res = await fetch(
          `http://wttr.in/${lat}${lon ? ',' + lon : ''}?format=j1`,
          { headers: { Accept: "application/json" } }
        );
        if (!res.ok) throw new Error("weather fetch failed");
        const data = await res.json();
        if (cancelled) return;

        const cur = data.current_condition?.[0];
        const area = data.nearest_area?.[0];
        const city =
          area?.areaName?.[0]?.value ||
          area?.region?.[0]?.value ||
          "Your location";

        const todayWeather = data.weather?.[0];

        setWeather({
          city,
          tempC: cur?.temp_C ?? "--",
          desc: cur?.weatherDesc?.[0]?.value ?? "",
          feelsLike: cur?.FeelsLikeC ?? "--",
          highC: todayWeather?.maxtempC ?? "--",
          lowC: todayWeather?.mintempC ?? "--",
          humidity: cur?.humidity ?? "--",
          code: parseInt(cur?.weatherCode ?? "113", 10),
        });
      } catch {
        if (!cancelled) setWeather(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    if (!navigator.geolocation) {
      // fallback: auto-detect via wttr.in
      fetch("http://wttr.in/?format=j1", { headers: { Accept: "application/json" } })
        .then((r) => r.json())
        .then((data) => {
          if (cancelled) return;
          const cur = data.current_condition?.[0];
          const area = data.nearest_area?.[0];
          const city = area?.areaName?.[0]?.value || "Your location";
          const todayWeather = data.weather?.[0];
          setWeather({
            city,
            tempC: cur?.temp_C ?? "--",
            desc: cur?.weatherDesc?.[0]?.value ?? "",
            feelsLike: cur?.FeelsLikeC ?? "--",
            highC: todayWeather?.maxtempC ?? "--",
            lowC: todayWeather?.mintempC ?? "--",
            humidity: cur?.humidity ?? "--",
            code: parseInt(cur?.weatherCode ?? "113", 10),
          });
        })
        .catch(() => setWeather(null))
        .finally(() => { if (!cancelled) setLoading(false); });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => fetchWeather(pos.coords.latitude, pos.coords.longitude),
      () => {
        // denied — use IP-based auto detect
        fetchWeather("", "");
      },
      { timeout: 6000 }
    );

    return () => { cancelled = true; };
  }, []);

  return { weather, loading };
}
