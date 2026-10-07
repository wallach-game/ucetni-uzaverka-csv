# Účetní uzávěrka z CSV

Bookmarklet / webová stránka, která načte CSV export, vybere měsíc a vytvoří tisknutelnou měsíční uzávěrku (uložení do PDF přes Tisk).
Zpracování probíhá jen v prohlížeči, data se nikam neposílají.

- `index.html` – samostatná stránka (GitHub Pages)
- `install.html` – instalace bookmarkletu na PC
- `bookmarklet-url.txt` – hotová adresa `javascript:` pro záložku (mobil)
- `uzaverka.js` – zdrojový kód
- `vzor.csv` – ukázková data

Podporované formáty: export prodejů z automatu (datum, cena, dph, produkt…), účetní deník (MD/DAL/částka), příjmy a výdaje.
Výstup je přehled tržeb a DPH, nikoli právně závazná účetní závěrka.
