#!/usr/bin/env python3
"""Vérifie que les pages HTML publiées sont bien formées.

Attrape un collage raté : morceau de commentaire visible, deuxième <head> ou <body>,
<style> égaré dans la page, balise fermante orpheline, texte nu directement dans
.article-body. Lancé automatiquement avant chaque commit (outils/hooks/pre-commit).

Usage : python3 outils/verifier-pages.py [fichiers…]
Sans argument, vérifie toutes les pages de public/. Code de sortie 1 s'il y a un problème.
"""
import sys
from html.parser import HTMLParser
from pathlib import Path

VIDES = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta",
         "source", "track", "wbr"}
UNIQUES = ("html", "head", "body", "main", "title")
TETE_SEULEMENT = {"style", "title", "meta", "link"}
FERMETURE_IMPLICITE = {"p", "li"}


class Verif(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.pile = []      # (balise, classes) des éléments ouverts
        self.erreurs = []
        self.compte = {}
        self.dans_body = False

    def err(self, msg):
        self.erreurs.append(f"ligne {self.getpos()[0]} : {msg}")

    def dans_svg(self):
        return any(t == "svg" for t, _ in self.pile)

    def handle_starttag(self, tag, attrs):
        if not self.dans_svg():
            self.compte[tag] = self.compte.get(tag, 0) + 1
        if tag == "body":
            self.dans_body = True
        elif self.dans_body and tag in TETE_SEULEMENT and not self.dans_svg():
            self.err(f"<{tag}> dans le corps de la page (collage raté ?)")
        if tag not in VIDES:
            self.pile.append((tag, (dict(attrs).get("class") or "").split()))

    def handle_startendtag(self, tag, attrs):
        pass  # <path/>, <line/>… dans les SVG : rien à empiler

    def handle_endtag(self, tag):
        if tag in VIDES:
            return
        if tag not in (t for t, _ in self.pile):
            self.err(f"</{tag}> sans balise ouvrante")
            return
        while self.pile:
            haut, _ = self.pile.pop()
            if haut == tag:
                break
            if haut not in FERMETURE_IMPLICITE:
                self.err(f"<{haut}> non fermée avant </{tag}>")

    def handle_data(self, data):
        if not self.dans_body or not data.strip():
            return
        extrait = data.strip()[:60]
        if "-->" in data or "<!--" in data:
            self.err(f"morceau de commentaire visible : {extrait!r}")
        if self.pile and "article-body" in self.pile[-1][1]:
            self.err(f"texte nu dans .article-body : {extrait!r}")

    def verifier(self, texte):
        self.feed(texte)
        self.close()
        for t in UNIQUES:
            n = self.compte.get(t, 0)
            if n != 1:
                self.erreurs.append(f"<{t}> présent {n} fois (attendu : 1)")
        restes = [t for t, _ in self.pile if t not in FERMETURE_IMPLICITE]
        if restes:
            self.erreurs.append(f"balises jamais fermées : {', '.join(restes)}")
        return self.erreurs


def main(chemins):
    racine = Path(__file__).resolve().parent.parent
    fichiers = [Path(c).resolve() for c in chemins] or sorted((racine / "public").rglob("*.html"))
    total = 0
    for f in fichiers:
        for e in Verif().verifier(f.read_text(encoding="utf-8")):
            print(f"{f.relative_to(racine)} — {e}")
            total += 1
    if total:
        print(f"\n{total} problème(s). Corriger avant de publier.")
        return 1
    print(f"{len(fichiers)} page(s) vérifiée(s) : aucun problème.")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
