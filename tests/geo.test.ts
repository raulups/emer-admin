import { describe, expect, it } from "vitest";

import { looksLikeFakePlaceId, parseLocationInput } from "@/lib/geo";

describe("parseLocationInput", () => {
  it("lee coordenadas sueltas", () => {
    expect(parseLocationInput("40.4234, -3.7015").coords).toEqual({ lat: 40.4234, lng: -3.7015 });
    expect(parseLocationInput("40.4234 -3.7015").coords).toEqual({ lat: 40.4234, lng: -3.7015 });
  });

  it("prefiere el pin del sitio a la vista en enlaces de Google Maps", () => {
    const url =
      "https://www.google.com/maps/place/Nude+Project/@40.4230,-3.7020,17z/data=!3m1!4b1!4m6!3m5!1s0xd42287cfc534fa3:0x49fbee3f5a6da6d7!8m2!3d40.4234!4d-3.7015!16s";
    expect(parseLocationInput(url).coords).toEqual({ lat: 40.4234, lng: -3.7015 });
  });

  it("lee query y query_place_id", () => {
    const url =
      "https://www.google.com/maps/search/?api=1&query=40.42%2C-3.69&query_place_id=ChIJo79T_MwnQg0R16ZtWj_u-0k";
    expect(parseLocationInput(url)).toEqual({
      coords: { lat: 40.42, lng: -3.69 },
      placeId: "ChIJo79T_MwnQg0R16ZtWj_u-0k",
    });
  });

  it("lee OpenStreetMap", () => {
    expect(
      parseLocationInput("https://www.openstreetmap.org/#map=18/40.42340/-3.70150").coords,
    ).toEqual({ lat: 40.4234, lng: -3.7015 });
  });

  it("descarta lo que no son coordenadas", () => {
    expect(parseLocationInput("Calle de Fuencarral 47").coords).toBeNull();
    expect(parseLocationInput("200, 10").coords).toBeNull();
  });
});

describe("looksLikeFakePlaceId", () => {
  it("acepta un place_id real", () => {
    expect(looksLikeFakePlaceId("ChIJo79T_MwnQg0R16ZtWj_u-0k")).toBe(false);
    expect(looksLikeFakePlaceId("ChIJUZYwmc4nQg0RX409c5ToFtY")).toBe(false);
  });

  it("marca los inventados", () => {
    expect(looksLikeFakePlaceId("ChIJ_8_8_8_8_8_8_8_8_8_8_8")).toBe(true);
    expect(looksLikeFakePlaceId("ChIJp3Z0z84nQg0RE0_8_8_8_8_8")).toBe(true);
    expect(looksLikeFakePlaceId("ChIJZ_m0mK6YpBIRm_H_M_H_M_H")).toBe(true);
    expect(looksLikeFakePlaceId("ChIJI1F05475326098708")).toBe(true);
    expect(looksLikeFakePlaceId("ChIJ86_9_84nQg0R_8_8_8_8_8_8")).toBe(true);
  });
});
