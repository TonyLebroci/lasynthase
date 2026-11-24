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
    "numero": "Module 1", "titre": "La zone 2", "sous_titre": "L'endurance de base.",
    "essentiel": [
      "Le travail <b>long et facile</b>, juste sous le premier seuil (LT1 par le lactate, VT1 par la respiration).",
      "Des repères <b>combinés</b> : la FC, l'effort perçu, et on parle encore en phrases.",
      "Ce sont surtout les <b>fibres lentes</b> qui travaillent. En fin de sortie, si la FC monte à même allure, <b>ralentissez</b>.",
    ],
    "chiffres": [("67-82 %", "de la FC max, en moyenne"), ("2-3 / 10", "d'effort perçu"), ("1-2 mmol/L", "de lactate")],
    "graphe": ("graphe-lactate-titre", "La zone 2 sur la courbe de lactate (schéma)"),
    "retenir": "Facile, et ça doit le rester. Pour connaître votre vrai premier seuil, rien ne remplace un test de lactate.",
    "sources": "Sitko S. et al., IJSPP, 2025 ; échelle d'Olympiatoppen, 2024 ; Gollnick P. D. et al., J Physiol, 1974.",
  },
  "seuil": {
    "numero": "Module 2", "titre": "Le threshold", "sous_titre": "La limite du soutenable.",
    "essentiel": [
      "L'intensité la plus haute où <b>le lactate reste stable</b>. Juste au-dessus, on tient environ 30 minutes au plus.",
      "<b>Le situer</b> par un test par paliers ; <b>le suivre</b> chaque semaine sur la même montée, à FC fixe.",
      "<b>Le volume d'endurance</b> le fait monter, pas seulement le travail au seuil.",
    ],
    "chiffres": [("4 mmol/L", "repère sur l'échelle norvégienne"), ("≈ 30 min", "au plus, juste au-dessus"), ("10-20 min", "la montée-étalon, chaque semaine, à la FC du threshold")],
    "graphe": ("gE-t", "Gain moyen après 7 semaines, selon la séance"),
    "retenir": "On le situe par un test, on le suit chaque semaine, et le volume d'endurance le fait monter.",
    "sources": "Beneke R. et al., MSSE, 2000 ; Dubouchaud H. et al., Am J Physiol, 2000 ; Seiler S. et al., SJMSS, 2013.",
  },
  "30-15": {
    "numero": "Module 3", "titre": "Les intervalles 30/15", "sous_titre": "Trente secondes fort, quinze secondes plus facile.",
    "essentiel": [
      "<b>3 séries de 13 × (30 s / 15 s)</b>, 3 min entre les séries. 30 s à l'intensité la plus haute tenable jusqu'au bout : pas un sprint.",
      "Les 15 s sont <b>trop courtes pour que la VO2 retombe</b> : à puissance fixée, plus de temps près du VO2max.",
      "<b>Prometteur, pas réglé</b> : peu de cyclistes, peu de semaines. Il complète la zone 2 et le seuil.",
    ],
    "chiffres": [("30 s", "à l'intensité la plus haute tenable jusqu'au bout"), ("15 s", "à environ la moitié : la VO2 n'a pas le temps de retomber"), ("39", "efforts en tout : 3 séries de 13")],
    "graphe": ("g1-t", "La séance des études"),
    "retenir": "Le 30/15 ajoute du temps tout près du VO2max. Il ne remplace ni la zone 2 ni le travail au seuil.",
    "sources": "Rønnestad B. R. et al., SJMSS, 2015 et 2020 ; Almquist N. W. et al., SJMSS, 2020 ; Urianstad T. et al., EJSS, 2024.",
  },
  "vo2max": {
    "numero": "Module 4", "titre": "Le VO2max", "sous_titre": "La taille du moteur aérobie.",
    "essentiel": [
      "Le VO2max, c'est <b>la plus grande quantité d'oxygène que le corps peut consommer en une minute</b> : la taille du moteur aérobie.",
      "Il dépend de <b>quatre maillons</b> : les poumons, le cœur et le sang, la vascularisation, les mitochondries. Le plafond vient surtout de la livraison (1 et 2).",
      "C'est un plafond : <b>la part qu'on en tient</b> longtemps (le threshold) et l'efficacité comptent aussi.",
    ],
    "chiffres": [("mL/kg/min", "le moteur divisé par le poids : 4,2 L/min ÷ 70 kg = 60"), ("Labo", "un test par paliers avec un masque : la vraie mesure"), ("Montre", "un calcul : une estimation")],
    "graphe": ("g3-t", "Les quatre maillons"), "taille": "width:6in; max-height:3.0in;",
    "retenir": "La taille du moteur, fixée surtout par ce que le cœur et le sang livrent.",
    "sources": "Bassett D. R., Howley E. T., MSSE, 2000 ; Joyner M. J., Coyle E. F., J Physiol, 2008.",
  },
  "sprint": {
    "numero": "Module 5", "titre": "Le sprint et la créatine phosphate", "sous_titre": "L'énergie immédiate du muscle.",
    "essentiel": [
      "Le muscle refait son ATP de <b>trois façons</b> qui travaillent ensemble : la créatine phosphate (immédiate), la glycolyse (rapide), l'aérobie (une réserve énorme).",
      "La <b>créatine phosphate</b> fournit le coup de fouet du début d'un sprint, puis elle se vide vite.",
      "<b>L'aérobie la recharge</b>, avec l'oxygène : après un sprint de 30 s à fond, il faut environ une minute pour en refaire la moitié.",
    ],
    "chiffres": [("≈ 10 s", "au 2e sprint, elle est presque toute utilisée"), ("≈ 1 min", "pour en refaire la moitié après 30 s à fond"), ("Circulation", "bloquée : pas de recharge")],
    "graphe": ("h2-t", "La navette de la créatine phosphate (schéma)"), "taille": "width:5.8in; max-height:2.9in;",
    "retenir": "La créatine phosphate fournit le coup de fouet ; c'est l'aérobie qui la recharge.",
    "sources": "Gastin P. B., Sports Med, 2001 ; Wallimann T. et al., Biochem J, 1992 ; Harris R. C. et al., Pflügers Arch, 1976 ; Bogdanis G. C. et al., J Physiol, 1995, et J Appl Physiol, 1996.",
  },
}

# Vert du site -> or et noir, pour les graphiques repris des modules
RECOLORE = {"#a9b79c": "#e8dfca", "#7c9070": "#ab8a4b", "#55654a": "#7d6a45", "#8a6c34": "#4a4236", "#b06a4f": "#201f1b"}

CSS = r"""
@page { size: Letter; margin: 0; }
:root { --noir:#1b1a17; --charbon:#201f1b; --gris:#5a594f; --or:#ab8a4b; --or-fonce:#8a6c34; --or-pale:#e8dfca; --creme:#f7f4ee; --ligne:#e4ddcf;
  --sage:#c9b27d; --sage-dark:#ab8a4b; --sage-deep:#8a6c34; --terracotta:#201f1b; --charcoal:#201f1b; --charcoal-soft:#4a4a40; --cream:#f7f4ee; --line:#ddd6c7; --gold:#ab8a4b;
  --font-sans:"Jost",Helvetica,Arial,sans-serif; --font-serif:"Cormorant Garamond",Georgia,serif; }
* { box-sizing:border-box; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
html,body { margin:0; padding:0; }
body > * { flex-shrink:0; }
body { width:8.5in; height:11in; display:flex; flex-direction:column; font-family:var(--font-sans); color:var(--charbon); background:#fff; font-weight:300; font-size:11pt; line-height:1.5; }
.tete { background:var(--noir); color:var(--creme); padding:0.44in 0.75in 0.36in; border-bottom:3px solid var(--or); }
.marque { display:flex; justify-content:space-between; font-size:7.5pt; letter-spacing:0.32em; text-transform:uppercase; color:var(--or); font-weight:400; }
.tete h1 { font-family:var(--font-serif); font-weight:400; font-size:38pt; line-height:1; margin:0.24in 0 0.06in; color:#fff; }
.tete .sous { font-family:var(--font-serif); font-style:italic; font-size:15pt; color:var(--or-pale); margin:0; }
.corps { padding:0.36in 0.75in 0; }
h2 { font-size:7.5pt; letter-spacing:0.32em; text-transform:uppercase; color:var(--or-fonce); font-weight:500; margin:0 0 0.14in; }
ol.essentiel { list-style:none; margin:0; padding:0; counter-reset:n; }
ol.essentiel li { counter-increment:n; position:relative; padding:0 0 0.14in 0.46in; }
ol.essentiel li::before { content:counter(n); position:absolute; left:0; top:-0.07in; font-family:var(--font-serif); font-size:24pt; color:var(--or); line-height:1; }
ol.essentiel b { font-weight:500; color:var(--noir); }
.graphe { margin:0.18in 0.75in 0; }
.graphe svg { display:block; width:4.6in; max-height:2.45in; margin:0 auto; }
.chiffres { margin:0.22in 0.75in 0; display:grid; grid-template-columns:repeat(3,1fr); border-top:1px solid var(--ligne); border-bottom:1px solid var(--ligne); }
.chiffre { padding:0.16in 0.14in; text-align:center; }
.chiffre + .chiffre { border-left:1px solid var(--ligne); }
.chiffre .n { font-family:var(--font-serif); font-size:21pt; line-height:1.05; color:var(--or-fonce); font-weight:500; }
.chiffre .t { font-size:8.4pt; color:var(--gris); line-height:1.3; margin-top:0.04in; }
.retenir { margin:0.24in 0.75in 0; padding:0 0 0 0.24in; border-left:3px solid var(--or); }
.retenir p.titre { font-size:7.5pt; letter-spacing:0.32em; text-transform:uppercase; color:var(--or-fonce); margin:0 0 0.04in; font-weight:500; }
.retenir p.texte { font-family:var(--font-serif); font-size:16pt; line-height:1.3; margin:0; color:var(--noir); }
.sources { margin:0.2in 0.75in 0.16in; font-size:7.2pt; color:var(--gris); line-height:1.4; }
.pied { margin-top:auto; border-top:1px solid var(--or); margin-left:0.75in; margin-right:0.75in; padding:0.12in 0 0.36in; color:var(--or-fonce); font-size:7.5pt; letter-spacing:0.22em; text-transform:uppercase; display:flex; justify-content:space-between; }
.pied span.blanc { color:var(--gris); letter-spacing:0.12em; text-transform:none; }
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
.graphe-lactate .noeud { fill:var(--noir); }
.graphe-lactate .noeud-nom { font-size:16px; font-weight:500; fill:#fff; }
.graphe-lactate .noeud-num { fill:var(--or); font-family:var(--font-serif); font-size:20px; }
.graphe-lactate .noeud-texte { font-size:13px; fill:var(--creme); fill-opacity:0.85; }
.graphe-lactate .fleche { stroke:var(--or); stroke-width:3; fill:none; }
.graphe-lactate .fleche-pointe { fill:var(--or); }
.graphe-lactate .centre { fill:none; stroke:var(--or); stroke-width:2; }
.graphe-lactate .centre-texte { font-family:var(--font-serif); font-size:22px; font-style:italic; fill:var(--noir); }
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
<section class="corps"><h2>L'essentiel</h2><ol class="essentiel">{essentiel}</ol></section>
<section class="graphe"><h2>{html.escape(f['graphe'][1])}</h2>{svg}</section>{('<style>.graphe svg{' + f['taille'] + '}</style>') if f.get('taille') else ''}
<section class="chiffres">{chiffres}</section>
<section class="retenir"><p class="titre">À retenir</p><p class="texte">{html.escape(f['retenir'])}</p></section>
<p class="sources">Sources : {html.escape(f['sources'])} Toutes les études sont dans le module.</p>
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
