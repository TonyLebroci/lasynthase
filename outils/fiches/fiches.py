#!/usr/bin/env python3
"""Fiches résumé à télécharger, une par module (demande de Tony, 2026-11-23).

Une page Letter, noir et or, aux couleurs du site. Le contenu de chaque fiche est ci-dessous
(FICHES) ; le graphique est repris tel quel de la page du module, recoloré en or.

    python3 outils/fiches/fiches.py            # toutes les fiches
    python3 outils/fiches/fiches.py vo2max     # une seule

Sortie : public/modules/fiches/<id>.pdf (derrière la connexion, comme les modules).
Règle : la fiche ne dit rien que le module ne dit pas. Changer un module = régénérer sa fiche.
"""
import html, os, re, subprocess, sys, tempfile

RACINE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

FICHES = {
  "zone-2": {
    "numero": "Module 1", "titre": "La zone 2", "sous_titre": "L'endurance de base : la reconnaître, ce qu'elle développe, la pratiquer.",
    "essentiel": [
      "La zone 2 (I2) est le travail <b>long et facile</b>, juste sous le premier seuil : LT1 par le lactate du sang, VT1 par la respiration.",
      "Les repères se combinent : <b>67 à 82 % de la FC max</b> en moyenne, un effort de <b>2 à 3 sur 10</b>, un lactate d'environ 1,0 à 2,0 mmol/L. On parle encore en phrases.",
      "Ce sont surtout les <b>fibres lentes</b> qui travaillent : elles brûlent une grande part de graisses dans leurs mitochondries.",
      "Ce qu'on en attend : <b>plus de mitochondries et de capillaires</b>. La quantité d'entraînement semble être ce qui fait le plus augmenter les mitochondries.",
      "En fin de sortie, si la FC monte à même allure, <b>ralentissez</b>. Regardez la vitesse ou la puissance avec la FC, pas la FC seule.",
    ],
    "chiffres": [("67-82 %", "de la FC max, en moyenne"), ("2-3 / 10", "d'effort perçu"), ("1-2", "mmol/L de lactate (I2)"), ("10 %", "écart entre les FC des deux seuils : au-delà, bâtir la base (règle d'entraîneur)")],
    "graphe": ("graphe-lactate-titre", "La zone 2 sur la courbe de lactate (schéma), en % de la FC max"),
    "retenir": "La zone 2 bâtit la base de toute l'endurance. Facile, et ça doit le rester. Pour connaître votre vrai premier seuil, rien ne remplace un test de lactate.",
    "sources": "Sitko S. et al., IJSPP, 2025 (consensus d'experts) ; échelle d'intensité d'Olympiatoppen, 2024 ; Gollnick P. D. et al., J Physiol, 1974 ; van Loon L. J. et al., J Physiol, 2003 ; Achten J. et al., MSSE, 2002 ; Uphill Athlete (test des 10 %, règle d'entraîneur).",
  },
  "seuil": {
    "numero": "Module 2", "titre": "Le threshold", "sous_titre": "La limite du soutenable : le mesurer, le faire monter, s'entraîner.",
    "essentiel": [
      "Le threshold (LT2, le seuil) est <b>l'intensité la plus haute où le lactate du sang reste stable</b>. Au-dessus, il monte jusqu'à ce qu'on ralentisse.",
      "Au-dessus, on puise dans une <b>réserve fixe (W′)</b> : temps limite = W′ ÷ (puissance − threshold). Juste au-dessus : environ 30 minutes au plus.",
      "<b>Le mesurer</b> : un test par paliers de 4 à 6 minutes, une goutte de sang à chaque palier. <b>Le suivre</b> : la même montée, chaque semaine, à la FC du threshold.",
      "<b>Le faire monter</b> : le volume d'endurance entraîne les fibres lentes à recycler le lactate. Pas seulement le travail au seuil.",
      "<b>S'entraîner</b> : chez des amateurs, 4 × 8 min un peu au-dessus du seuil a donné les plus gros gains. Finir avec l'impression qu'on aurait pu en faire encore un peu.",
    ],
    "chiffres": [("4 mmol/L", "repère du threshold sur l'échelle norvégienne"), ("≈ 30 min", "au plus, juste au-dessus"), ("+11,4 %", "gain moyen (VO2max, puissance au VO2max et à 4 mmol/L), 4 × 8 min, 7 semaines"), ("10-20 min", "la montée-étalon, chaque semaine")],
    "graphe": ("gE-t", "Gain moyen après 7 semaines, selon la séance (35 cyclistes amateurs)"),
    "retenir": "Le threshold est le plafond du soutenable. On le situe par un test, on le suit chaque semaine, et le volume d'endurance le fait monter, pas seulement le travail au seuil.",
    "sources": "Beneke R. et al., MSSE, 2000 ; Jamnick N. A. et al., Sports Med, 2020 ; Poole D. C. et al., MSSE, 2016 ; Dubouchaud H. et al., Am J Physiol, 2000 ; Seiler S. et al., SJMSS, 2013 ; Walther J. et al., EJSS, 2025.",
  },
  "30-15": {
    "numero": "Module 3", "titre": "Les intervalles 30/15", "sous_titre": "Trente secondes fort, quinze secondes plus facile : ce qui se passe dans le corps et ce que disent les études.",
    "essentiel": [
      "Le protocole des études : <b>3 séries de 13 × (30 s / 15 s)</b>, 3 minutes entre les séries. 30 s à l'intensité la plus haute tenable jusqu'au bout, 15 s à environ la moitié. Pas un sprint.",
      "Les 15 s sont <b>trop courtes pour que la consommation d'oxygène retombe</b> : à puissance fixée, plus de temps près du VO2max qu'à allure constante ou en 6 × 5 min. Au ressenti, c'est partagé.",
      "Pendant la pause, la <b>phosphocréatine se refait en partie</b>, et seulement avec de l'oxygène. Le cœur reste à haut régime.",
      "Chez des cyclistes élites, en 3 semaines : <b>puissance sur 20 min +4,7 %</b>, contre −1,4 % en 4 × 5 min. Le VO2max n'a pas changé de façon significative.",
      "<b>Prometteur, pas réglé</b> : petits groupes, des cyclistes, presque toujours la même équipe. Il complète la zone 2 et le seuil, il ne les remplace pas.",
    ],
    "chiffres": [("39", "efforts de 30 s, 19,5 min d'effort"), ("+14 %", "de puissance : 421 W contre 371 W, même effort perçu"), ("+4,7 %", "puissance sur 20 min, cyclistes élites"), ("23-29 s", "à la montée, pour que la VO2 fasse environ 63 % du chemin")],
    "graphe": ("g1-t", "La séance des études : la séance entière, puis trois répétitions"),
    "retenir": "Le 30/15 ajoute du temps tout près du VO2max. Il complète la zone 2 et le travail au seuil ; il ne les remplace pas.",
    "sources": "Rønnestad B. R. et al., SJMSS, 2015 et 2020, et EJSS, 2025 ; Almquist N. W. et al., SJMSS, 2020 ; Urianstad T. et al., EJSS, 2024 ; Prinz B. et al., JSSM, 2021 ; Harris R. C. et al., Pflügers Arch, 1976 ; Bogdanis G. C. et al., J Physiol, 1995 ; Appelhans D. et al., IJSPP, 2025.",
  },
  "vo2max": {
    "numero": "Module 4", "titre": "Le VO2max", "sous_titre": "Le plafond aérobie : ce qui le limite, comment le faire monter, ce qu'il dit de la santé.",
    "essentiel": [
      "Le VO2max est <b>la plus grande quantité d'oxygène que le corps peut consommer en une minute</b>. Il s'écrit en mL/kg/min : 4,2 L/min ÷ 70 kg = 60.",
      "Le plafond vient surtout de <b>la livraison de l'oxygène</b> : le cœur et le sang, plus que le muscle.",
      "<b>Des intervalles près du VO2max</b> le font plus monter que le même travail plus lent. Dans une étude, une plus grosse dose a fait progresser la puissance maximale de tout le monde.",
      "<b>Il ne fait pas tout</b> : la part qu'on en tient longtemps (le threshold) et l'efficacité comptent aussi.",
      "Il baisse d'environ <b>10 % par décennie</b>, et une meilleure condition va avec un risque de décès plus bas. Un lien, pas une preuve de cause.",
    ],
    "chiffres": [("+7,2 %", "VO2max en 8 semaines de 4 × 4 min à 90-95 % de la FC max"), ("+10 %", "environ, le sang envoyé à chaque battement"), ("× 5", "risque de décès, condition faible contre élite"), ("3,5", "mL/kg/min = 1 MET")],
    "graphe": ("g4-t", "Hausse du VO2max en 8 semaines, à travail égal (40 hommes)"),
    "retenir": "Le VO2max est le plafond. On le fait monter avec des intervalles près du maximum ; on s'en sert grâce au threshold et à l'efficacité.",
    "sources": "Bassett D. R., Howley E. T., MSSE, 2000 ; Helgerud J. et al., MSSE, 2007 ; Montero D., Lundby C., J Physiol, 2017 ; Joyner M. J., Coyle E. F., J Physiol, 2008 ; Kaminsky L. A. et al., Mayo Clin Proc, 2015 ; Mandsager K. et al., JAMA Netw Open, 2018 ; Kodama S. et al., JAMA, 2009.",
  },
}

# Vert du site -> or et noir, pour les graphiques repris des modules
RECOLORE = {"#a9b79c": "#e8dfca", "#7c9070": "#ab8a4b", "#55654a": "#7d6a45", "#8a6c34": "#4a4236", "#b06a4f": "#201f1b"}

CSS = r"""
@page { size: Letter; margin: 0; }
:root { --noir:#1b1a17; --charbon:#201f1b; --gris:#4a4a40; --or:#ab8a4b; --or-fonce:#8a6c34; --or-pale:#e8dfca; --creme:#f7f4ee; --ligne:#ddd6c7;
  --sage:#c9b27d; --sage-dark:#ab8a4b; --sage-deep:#8a6c34; --terracotta:#201f1b; --charcoal:#201f1b; --charcoal-soft:#4a4a40; --cream:#f7f4ee; --line:#ddd6c7; --gold:#ab8a4b;
  --font-sans:"Jost",Helvetica,Arial,sans-serif; --font-serif:"Cormorant Garamond",Georgia,serif; }
* { box-sizing:border-box; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
html,body { margin:0; padding:0; }
body > * { flex-shrink:0; }
body { width:8.5in; height:11in; display:flex; flex-direction:column; font-family:var(--font-sans); color:var(--charbon); background:#fff; font-weight:300; font-size:10pt; line-height:1.42; }
.tete { background:var(--noir); color:var(--creme); padding:0.42in 0.6in 0.32in; position:relative; }
.tete::after { content:""; position:absolute; left:0; right:0; bottom:0; height:4px; background:linear-gradient(90deg,var(--or-fonce),var(--or),var(--or-fonce)); }
.marque { display:flex; justify-content:space-between; font-size:8pt; letter-spacing:0.32em; text-transform:uppercase; color:var(--or); font-weight:400; }
.tete h1 { font-family:var(--font-serif); font-weight:400; font-size:36pt; line-height:1.02; margin:0.18in 0 0.06in; color:#fff; }
.tete .sous { font-family:var(--font-serif); font-style:italic; font-size:14pt; color:var(--or-pale); margin:0; }
.corps { padding:0.28in 0.6in 0; display:grid; grid-template-columns:1.55fr 1fr; gap:0.34in; }
h2 { font-size:8pt; letter-spacing:0.3em; text-transform:uppercase; color:var(--or-fonce); font-weight:500; margin:0 0 0.12in; padding-bottom:0.06in; border-bottom:1px solid var(--ligne); }
ol.essentiel { list-style:none; margin:0; padding:0; counter-reset:n; }
ol.essentiel li { counter-increment:n; position:relative; padding:0 0 0.09in 0.42in; }
ol.essentiel li::before { content:counter(n); position:absolute; left:0; top:-0.06in; font-family:var(--font-serif); font-size:22pt; color:var(--or); line-height:1; }
ol.essentiel b { font-weight:500; color:var(--noir); }
.chiffres { display:flex; flex-direction:column; gap:0.1in; }
.chiffre { border-left:3px solid var(--or); padding:0.02in 0 0.04in 0.14in; }
.chiffre .n { font-family:var(--font-serif); font-size:21pt; line-height:1.05; color:var(--noir); font-weight:500; }
.chiffre .t { font-size:8.6pt; color:var(--gris); line-height:1.3; }
.graphe { margin:0.12in 0.6in 0; }
.graphe svg { display:block; width:4.9in; max-height:2.15in; margin:0.04in auto 0; }
.retenir { margin:0.14in 0.6in 0; background:var(--noir); color:var(--creme); padding:0.18in 0.26in; border-top:3px solid var(--or); }
.retenir p.titre { font-size:7.6pt; letter-spacing:0.32em; text-transform:uppercase; color:var(--or); margin:0 0 0.05in; font-weight:500; }
.retenir p.texte { font-family:var(--font-serif); font-size:13.5pt; line-height:1.3; margin:0; color:#fff; }
.sources { margin:0.1in 0.6in 0.12in; font-size:7.2pt; color:var(--gris); line-height:1.35; }
.pied { margin-top:auto; background:var(--noir); color:var(--or); font-size:7.6pt; letter-spacing:0.22em; text-transform:uppercase; padding:0.16in 0.6in; display:flex; justify-content:space-between; }
.pied span.blanc { color:var(--creme); letter-spacing:0.12em; text-transform:none; }
/* Graphiques repris des modules */
.graphe-lactate { font-family:var(--font-sans); }
.graphe-lactate .grille { stroke:var(--line); stroke-width:1; }
.graphe-lactate .axe { stroke:var(--charcoal-soft); stroke-width:1; }
.graphe-lactate .graduation { font-size:13px; fill:var(--charcoal-soft); }
.graphe-lactate .titre-axe { font-size:13px; fill:var(--charcoal-soft); letter-spacing:0.04em; }
.graphe-lactate .nom-bande { font-size:13px; fill:var(--charcoal); letter-spacing:0.08em; }
.graphe-lactate .etiquette-z2 { font-size:15px; font-weight:500; fill:var(--charcoal); }
.graphe-lactate .etiquette-lt1 { font-size:13px; font-weight:500; fill:var(--charcoal); letter-spacing:0.08em; }
.graphe-lactate .etiquette-valeur { font-size:13px; fill:var(--charcoal); }
.graphe-lactate .ligne-lt1 { stroke:var(--charcoal); stroke-width:1.5; stroke-dasharray:4 4; }
.graphe-lactate .courbe { fill:none; stroke:var(--charcoal); stroke-width:2; stroke-linecap:round; }
.graphe-lactate .point { fill:var(--charcoal); stroke:#fff; stroke-width:2; }
.graphe-lactate .bande { fill-opacity:0.35; }
.graphe-lactate .bande.est-zone-2 { fill-opacity:0.8; stroke:var(--charcoal); stroke-width:1.5; }
.graphe-lactate .ligne-plafond { stroke:var(--or-fonce); stroke-width:1.5; stroke-dasharray:6 4; }
.graphe-lactate .etiquette { font-size:13px; fill:var(--charcoal-soft); }
.graphe-lactate .etiquette-forte { fill:var(--charcoal); font-weight:500; }
.graphe-lactate .etiquette-plafond { fill:var(--or-fonce); font-weight:500; }
.graphe-lactate .valeur { font-size:14px; font-weight:500; fill:var(--charcoal); }
.graphe-lactate .valeur-claire { fill:var(--noir); }
.graphe-lactate .barre { fill:#d8c89f; }
.graphe-lactate .barre-forte { fill:var(--or); }
.graphe-lactate .barre-baisse { fill:var(--charcoal); }
.graphe-lactate .barre-neutre { fill:var(--charcoal-soft); fill-opacity:0.45; }
.graphe-lactate .bande-fiable { fill:var(--or); fill-opacity:0.18; }
"""

def svg_du_module(id_module, id_titre):
    page = open(os.path.join(RACINE, "public", "modules", id_module + ".html"), encoding="utf-8").read()
    i = page.index(f'id="{id_titre}"')
    svg = page[page.rindex("<svg", 0, i):page.index("</svg>", i) + 6]
    for vert, autre in RECOLORE.items():
        svg = svg.replace(f'fill="{vert}"', f'fill="{autre}"')
    return svg

def page_fiche(id_module, f):
    svg = svg_du_module(id_module, f["graphe"][0])
    essentiel = "\n".join(f"<li>{t}</li>" for t in f["essentiel"])
    chiffres = "\n".join(f'<div class="chiffre"><div class="n">{html.escape(n)}</div><div class="t">{html.escape(t)}</div></div>' for n, t in f["chiffres"])
    return f"""<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>{html.escape(f['titre'])} — Fiche — La Synthase</title>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;1,400&family=Jost:wght@300;400;500&display=swap" rel="stylesheet">
<style>{CSS}</style></head><body>
<header class="tete"><div class="marque"><span>La Synthase</span><span>{html.escape(f['numero'])} · Fiche à garder</span></div>
<h1>{html.escape(f['titre'])}</h1><p class="sous">{html.escape(f['sous_titre'])}</p></header>
<section class="corps"><div><h2>L'essentiel</h2><ol class="essentiel">{essentiel}</ol></div>
<div><h2>Les chiffres clés</h2><div class="chiffres">{chiffres}</div></div></section>
<section class="graphe"><h2>{html.escape(f['graphe'][1])}</h2>{svg}</section>
<section class="retenir"><p class="titre">À retenir</p><p class="texte">{html.escape(f['retenir'])}</p></section>
<p class="sources">Sources : {html.escape(f['sources'])} Le détail et les liens vers chaque étude sont dans le module.</p>
<footer class="pied"><span>tony.lasynthase.ca</span><span class="blanc">Antoine Corbeil · La Synthase</span></footer>
</body></html>"""

def generer(id_module):
    f = FICHES[id_module]
    with tempfile.TemporaryDirectory() as tmp:
        source = os.path.join(tmp, id_module + ".html")
        open(source, "w", encoding="utf-8").write(page_fiche(id_module, f))
        sortie = os.path.join(RACINE, "public", "modules", "fiches", id_module + ".pdf")
        subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--no-pdf-header-footer",
                        "--virtual-time-budget=8000", f"--print-to-pdf={sortie}", "file://" + source],
                       check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    pages = len(re.findall(rb"/Type\s*/Page[^s]", open(sortie, "rb").read()))
    print(f"{id_module} : {sortie} ({pages} page{'s' if pages > 1 else ''})")
    return pages

if __name__ == "__main__":
    ids = sys.argv[1:] or list(FICHES)
    if "--html" in ids:  # aperçu : écrit le HTML sans l'imprimer
        ids.remove("--html")
        for i in ids or list(FICHES):
            open(f"/tmp/fiche-{i}.html", "w", encoding="utf-8").write(page_fiche(i, FICHES[i]))
            print(f"/tmp/fiche-{i}.html")
        sys.exit(0)
    trop = [i for i in ids if generer(i) > 1]
    if trop:
        sys.exit("Plus d'une page : " + ", ".join(trop) + ". Raccourcir le texte de la fiche.")
