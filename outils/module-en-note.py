#!/usr/bin/env python3
"""Module du site -> note Obsidian (copie de travail de Tony).

Usage :
    python3 outils/module-en-note.py zone-2          # écrit « Modules en note/<titre>.md »
    python3 outils/module-en-note.py zone-2 --stdout # affiche sans écrire (pour comparer)

La page en ligne (public/modules/<id>.html) reste la seule source publiée.
La note en est le miroir lisible : Tony y écrit, Claude reporte ses changements
dans la page, puis régénère la note. Les outils interactifs et les schémas
n'apparaissent que par leur titre et leur consigne (ils se modifient dans le code).
"""
import re
import sys
from datetime import date
from html.parser import HTMLParser
from pathlib import Path

RACINE = Path(__file__).resolve().parent.parent
DOSSIER_NOTES = RACINE / "Modules en note"
VIDES = {"br", "img", "input", "meta", "link", "hr", "source"}


class Noeud:
    def __init__(self, tag, attrs, parent=None):
        self.tag, self.attrs, self.parent = tag, dict(attrs), parent
        self.enfants = []

    def classes(self):
        return set((self.attrs.get("class") or "").split())

    def a(self, classe):
        return classe in self.classes()

    def trouver(self, test):
        if test(self):
            yield self
        for e in self.enfants:
            if isinstance(e, Noeud):
                yield from e.trouver(test)


class Lecteur(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.racine = Noeud("racine", [])
        self.courant = self.racine

    def handle_starttag(self, tag, attrs):
        n = Noeud(tag, attrs, self.courant)
        self.courant.enfants.append(n)
        if tag not in VIDES:
            self.courant = n

    def handle_endtag(self, tag):
        n = self.courant
        while n is not self.racine and n.tag != tag:
            n = n.parent
        if n is not self.racine:
            self.courant = n.parent

    def handle_data(self, data):
        self.courant.enfants.append(data)


def enligne(n):
    """Texte d'un élément, avec gras, italique et liens en Markdown."""
    if isinstance(n, str):
        return re.sub(r"\s+", " ", n)
    if n.tag in ("svg", "script", "style", "input") or n.a("num-question"):
        return ""
    if n.tag == "br":
        return " "
    dedans = "".join(enligne(e) for e in n.enfants)
    if n.tag in ("strong", "b"):
        return f"**{dedans.strip()}**" if dedans.strip() else ""
    if n.tag in ("em", "i"):
        return f"*{dedans.strip()}*" if dedans.strip() else ""
    if n.tag == "a" and n.attrs.get("href"):
        return f"[{dedans.strip()}]({n.attrs['href']})"
    if n.a("reponse-carte"):
        return ""
    return dedans


def texte(n):
    return re.sub(r"\s+", " ", enligne(n)).strip()


def citer(lignes):
    return ["> " + l if l else ">" for l in lignes]


def blocs(n):
    """Contenu d'un conteneur en lignes Markdown (paragraphes séparés)."""
    sortie = []
    for e in n.enfants:
        if isinstance(e, str):
            if e.strip():
                sortie += [re.sub(r"\s+", " ", e).strip(), ""]
            continue
        sortie += bloc(e)
    return sortie


def bloc(e):
    t = e.tag
    if t in ("svg", "script", "style", "button") and not e.a("carte-choix"):
        return []
    if e.a("etape-numero") or e.a("navigation-etapes") or e.a("bilan-quiz"):
        return []
    if t == "h2":
        return []  # déjà dans le titre de l'étape
    if t == "h3":
        return [f"### {texte(e)}", ""]
    if t == "p":
        s = texte(e)
        return [s, ""] if s else []
    if t in ("ul", "ol"):
        lignes = []
        for i, li in enumerate(x for x in e.enfants if isinstance(x, Noeud) and x.tag == "li"):
            puce = f"{i + 1}." if t == "ol" else "-"
            lignes.append(f"{puce} {texte(li)}")
        return lignes + [""]
    if e.a("encadre"):
        titre = next((texte(x) for x in e.trouver(lambda x: x.a("titre-encadre"))), "Encadré")
        corps = [l for x in e.enfants if isinstance(x, Noeud) and not x.a("titre-encadre") for l in bloc(x)]
        genre = "tip" if "fiche" in titre.lower() else "note"
        return citer([f"[!{genre}] {titre}"] + corps[:-1] if corps else [f"[!{genre}] {titre}"]) + [""]
    if e.a("outil"):
        titre = next((texte(x) for x in e.trouver(lambda x: x.a("outil-titre"))), "Outil")
        consigne = next((texte(x) for x in e.trouver(lambda x: x.a("outil-consigne"))), "")
        corps = [consigne, ""] if consigne else []
        for cartes in e.trouver(lambda x: x.a("choix-cartes")):
            corps += bloc(cartes)
        corps.append("*(outil interactif : il se modifie dans le code)*")
        return citer([f"[!example] {titre}"] + corps) + [""]
    if e.a("choix-cartes"):
        lignes = []
        for c in e.trouver(lambda x: x.a("carte-choix")):
            rep = next((texte_reponse(r) for r in c.trouver(lambda x: x.a("reponse-carte"))), "")
            lignes.append(f"- **{texte(c)}** : {rep}")
        return lignes + [""]
    if e.a("sources"):
        s = " ".join(texte(x) for x in e.enfants if isinstance(x, Noeud))
        return [s, ""] if s else []
    if e.a("question"):
        return question(e)
    if t == "figure" or e.a("graphe") or e.a("schema"):
        legende = next((texte(x) for x in e.trouver(lambda x: x.tag == "figcaption")), "")
        return [f"> [!example] Schéma{' : ' + legende if legende else ''}", "> *(se modifie dans le code)*", ""]
    return blocs(e)


def question(e):
    num = next((texte_brut(x) for x in e.trouver(lambda x: x.a("num-question"))), "Question")
    enonce = next((texte(x) for x in e.trouver(lambda x: x.a("enonce"))), "")
    lignes = [f"**{num}.** {enonce}", ""]
    bonne = e.attrs.get("data-bonne")
    for b in e.trouver(lambda x: x.tag == "button" and "data-choix" in x.attrs):
        marque = " ✅" if b.attrs["data-choix"] == bonne else ""
        lignes.append(f"- {b.attrs['data-choix']}) {texte(b)}{marque}")
    if e.attrs.get("data-type") == "nombre":
        lignes.append(f"- Réponse acceptée : de {e.attrs.get('data-min')} à {e.attrs.get('data-max')} ✅")
    expl = next((texte(x) for x in e.trouver(lambda x: x.a("explication"))), "")
    lignes += ["", f"> Explication : {expl}", ""] if expl else [""]
    return lignes


def texte_reponse(n):
    """Texte d'une réponse de carte (enligne() la masque dans le libellé)."""
    return re.sub(r"\s+", " ", "".join(enligne(x) for x in n.enfants)).strip()


def texte_brut(n):
    if isinstance(n, str):
        return n
    return re.sub(r"\s+", " ", "".join(texte_brut(x) for x in n.enfants)).strip()


def exporter(ident):
    page = RACINE / "public" / "modules" / f"{ident}.html"
    lecteur = Lecteur()
    lecteur.feed(page.read_text(encoding="utf-8"))
    doc = lecteur.racine

    titre = next(texte(x) for x in doc.trouver(lambda x: x.tag == "h1"))
    surtitre = next((texte(x) for x in doc.trouver(lambda x: x.a("eyebrow"))), "")
    chapeau = next((texte(x) for x in doc.trouver(lambda x: x.a("lead"))), "")

    lignes = [
        "---",
        f"module: {ident}",
        f"page: public/modules/{ident}.html",
        f"en_ligne: https://tony.lasynthase.ca/modules/{ident}",
        f"miroir_du: {date.today().isoformat()}",
        "tags: [module, lasynthase]",
        "---",
        "",
        f"# {titre}",
        "",
        "> [!info] Ta copie de travail",
        "> Le miroir de la page en ligne. Écris ici directement : ajoute une section, change un mot,",
        "> laisse une idée en vrac avec **À FAIRE :**. Rien ne change en ligne tant que tu ne dis pas",
        f"> « publie le module {ident.replace('-', ' ')} » : Claude reporte alors tes changements dans la page,",
        "> régénère la fiche PDF, vérifie, et te demande avant la mise en ligne.",
        "",
        f"*{surtitre}*" if surtitre else "",
        "",
        chapeau,
        "",
    ]
    for i, etape in enumerate(doc.trouver(lambda x: x.tag == "section" and x.a("etape")), 1):
        h2 = next((texte(x) for x in etape.trouver(lambda x: x.tag == "h2")), etape.attrs.get("data-titre", ""))
        lignes += [f"## Étape {i} · {h2}", ""] + blocs(etape)

    md = "\n".join(lignes)
    md = re.sub(r"\n{3,}", "\n\n", md).strip() + "\n"
    return titre, surtitre, md


def nom_de_fichier(titre, surtitre):
    """« Module 1 · Entraînement » + « La zone 2, l'endurance de base » -> « Module 1 — La zone 2.md »."""
    court = titre.split(",")[0].strip().replace("/", "-")
    numero = re.match(r"Module \d+", surtitre or "")
    nom = f"{numero.group(0)} — {court}" if numero else court
    return re.sub(r'[\\:*?"<>|]', "", nom) + ".md"


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit("Usage : module-en-note.py <id> [--stdout]")
    titre, surtitre, md = exporter(sys.argv[1])
    if "--stdout" in sys.argv:
        sys.stdout.write(md)
    else:
        DOSSIER_NOTES.mkdir(exist_ok=True)
        cible = DOSSIER_NOTES / nom_de_fichier(titre, surtitre)
        cible.write_text(md, encoding="utf-8")
        print(cible)
