import { ImageResponse } from "next/og";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/config";

export const alt = `${SITE_NAME} — ${SITE_TAGLINE}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Default Open Graph image — warm ivory paper card with the charcoal serif
 *  wordmark and thin gold rules. Inherited by every route that doesn't
 *  define its own. */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#F9F8F4",
          backgroundImage:
            "radial-gradient(ellipse at center, #FFFFFF 0%, #F9F8F4 55%, #F2EFE9 100%)",
        }}
      >
        {/* top hairline */}
        <div
          style={{
            width: 96,
            height: 2,
            backgroundColor: "#CAA829",
            marginBottom: 48,
          }}
        />
        <div
          style={{
            fontSize: 92,
            fontFamily: "Georgia, serif",
            color: "#1A1C1C",
            letterSpacing: "0.14em",
            textAlign: "center",
          }}
        >
          {SITE_NAME.toUpperCase()}
        </div>
        <div
          style={{
            marginTop: 28,
            fontSize: 30,
            color: "#7A6018",
            letterSpacing: "0.42em",
            textTransform: "uppercase",
          }}
        >
          Fine Accessories
        </div>
        <div
          style={{
            marginTop: 40,
            fontSize: 26,
            fontFamily: "Georgia, serif",
            fontStyle: "italic",
            color: "#55585A",
          }}
        >
          {SITE_TAGLINE}
        </div>
        {/* bottom hairline */}
        <div
          style={{
            width: 96,
            height: 2,
            backgroundColor: "#CAA829",
            marginTop: 48,
          }}
        />
      </div>
    ),
    size,
  );
}
