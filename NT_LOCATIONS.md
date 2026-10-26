# Northern Territory destinations

Eight additional destinations bring the remote destination pool from 20 to 28. They use the same projection, scoring and random selection as the original destinations, within the existing SA/NT section. The selector still balances sections, rather than allowing the larger NT pool to dominate every challenge.

| Destination | Latitude | Longitude | Game interpretation |
| --- | ---: | ---: | --- |
| Mt Doreen Station | -22.089 | 131.422 | Representative station location; exact strip reference needs confirmation. |
| Tennant Creek | -19.6344 | 134.1830 | Tennant Creek Airport. |
| Galiwinku (Elcho Island) | -12.0194 | 135.5710 | Elcho Island Airport. |
| Tiwi | -11.76494 | 130.61585 | Bathurst Island Airfield, Wurrumiyanga. This is the selected point for the wider Tiwi Islands. |
| Borroloola | -16.0754 | 136.3028 | Borroloola Aerodrome. |
| Maningrida | -12.0561 | 134.2342 | Maningrida Airport. |
| Gove | -12.274467 | 136.823902 | Gove Airport, serving Nhulunbuy. |
| Ti Tree | -22.12732 | 133.42237 | Ti Tree Airstrip. |

## Reference sources and limitations

Checked 26 October 2026. Coordinates are game references. The original project's other destinations remain representative coordinates; this is not a flight-planning dataset.

- Ti Tree: NT Government Place Names Register, https://www.ntlis.nt.gov.au/placenames/view.jsp?id=23612
- Borroloola: NT Government Place Names Register, https://www.ntlis.nt.gov.au/placenames/view.jsp?id=20366
- Bathurst Island: NT Government Place Names Register, https://www.ntlis.nt.gov.au/placenames/view.jsp?id=23508
- Gove: NT Government Place Names Register, https://www.ntlis.nt.gov.au/placenames/view.jsp?id=13241
- Maningrida: Airservices AIP ERSA, 19 March 2026, 120322S 1341403E, https://www.airservicesaustralia.com/aip/current/ersa/FAC_YMGD_19MAR2026.pdf
- Elcho Island and Tennant Creek: OurAirports airport records, https://ourairports.com/airports/YELD/ and https://ourairports.com/airports/YTNK/
- Mt Doreen: representative station coordinate from https://en.wikipedia.org/wiki/Mount_Doreen_Station . An exact, authoritative airstrip coordinate was not established. Do not treat the station coordinate as a verified runway point.

All eight retain Port Augusta as the existing SA/NT **challenge departure** to avoid inventing operational bases or RFDS service routes. The interface describes this as a game route. This does not assert that the RFDS operates each depicted real-world leg.

Edit `data/destinations.js` to update a reference point. This is the sole destination source loaded by the app. `/data/index.html` redirects to the maintained game rather than serving a second outdated copy.
