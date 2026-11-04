# Astrokurz – souhvězdí zimní a podzimní oblohy

Interaktivní web na učení souhvězdí z tabulek „Souhvězdí zimní oblohy“ a
„Souhvězdí podzimní oblohy“ (výběr pro AK I).

**Co web umí**

- **Atlas** – karta pro každé souhvězdí: tvar, hvězdy z tabulek, objekty
  (M31, M42, Plejády…), latinský název, genitiv, zkratka a „jak ho najít“.
  Zvlášť je zimní mnohoúhelník, Pegasův čtverec a škopíček.
- **Mapa oblohy** – posun, zoom, natočení. Režim *Mapa* (sever nahoře) nebo
  *Nad obzorem* (obloha nad Prahou v daný den a čas). Vrstvy jdou vypnout,
  takže se můžeš zkoušet bez popisků. Kliknutím na hvězdu nebo souhvězdí
  uvidíš, co to je.
- **Procvičování** – simulace testu: ukazovátko míří na hvězdu, souhvězdí
  nebo objekt a ty odpovídáš (výběr ze 4 možností nebo psaní). Dále
  „najdi a klikni“ a otázky z tabulky (latinsky, genitiv, zkratka…).
  Web si pamatuje, co ti nejde, a ptá se na to častěji.
- **Tabulky** – tabulky z kurzu, sloupce jdou zakrýt a zkoušet se.

## Zveřejnění přes GitHub Pages

1. Na GitHubu otevři repozitář → **Settings** → **Pages**.
2. V části *Build and deployment* zvol **Source: Deploy from a branch**.
3. Vyber větev (např. `main`, nebo tu, ve které jsou soubory) a složku **/ (root)** → **Save**.
4. Za minutu dvě bude web na adrese `https://<uživatel>.github.io/<repozitář>/`.

Web je čistě statický (HTML + JS, žádný build), funguje i po otevření
`index.html` přímo z disku.

## Data

Polohy hvězd (Hipparcos / Yale Bright Star Catalogue), čáry a hranice
souhvězdí a Mléčná dráha pocházejí z projektu
[d3-celestial](https://github.com/ofrohn/d3-celestial) (© Olaf Frohn, BSD-3-Clause).
Soubor `data/sky-data.js` vytváří skript `tools/build_sky_data.py`.
Obsah kurzu (souhvězdí, hvězdy, objekty, tipy) je v `data/course.js`.
