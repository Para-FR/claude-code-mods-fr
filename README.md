# Claude Code Mods 🇫🇷

Deux **Claude Mods** construits en live dans [la vidéo YouTube de **Claude Code France**](https://youtu.be/_Hllg5sDhFo) :
Claude Code les a écrits lui-même, à partir d'une seule phrase chacun.

| Mod | Ce qu'il fait |
|---|---|
| 🛡️ **garde-du-corps** | Bloque la lecture et la modification des fichiers `.env` (les modèles `.env.example`, `.env.sample`… restent accessibles) et les commandes Bash destructrices : `rm -rf`, `git push --force` (et `--force-with-lease`), `git reset --hard`, `DROP TABLE`. Chaque blocage affiche un toast, et la status line compte les actions bloquées. |
| 🚀 **cockpit** | Un panneau live à côté de la conversation : modèle, coût, remplissage du contexte, nombre de tours, d'appels d'outils et de tokens, outils les plus utilisés, durée de chaque tour et derniers fichiers modifiés. S'ouvre avec `/cockpit`. |

> **Prérequis** : Claude Code **2.1.287** ou plus récent (les mods sont activés par défaut).
> Pour que le cockpit s'affiche en barre latérale, mets `"tui": "fullscreen"` dans ton `settings.json`.

## Installation

### Via la marketplace (le plus simple)

Dans Claude Code :

```
/plugin marketplace add Para-FR/claude-code-mods-fr
/plugin install garde-du-corps@claude-code-mods-fr
/plugin install cockpit@claude-code-mods-fr
```

### En clonant le repo

```bash
git clone https://github.com/Para-FR/claude-code-mods-fr.git ~/claude-code-mods-fr
claude --plugin-dir ~/claude-code-mods-fr/garde-du-corps --plugin-dir ~/claude-code-mods-fr/cockpit
```

## Vérifier et tester

```bash
claude plugin validate garde-du-corps && claude plugin test garde-du-corps
claude plugin validate cockpit && claude plugin test cockpit
```

## Les prompts qui ont créé ces mods

**garde-du-corps**

> Crée-moi un mod Claude Code "garde-du-corps" : il bloque toute lecture ou modification des fichiers .env, ainsi que les commandes Bash dangereuses (rm -rf, git push --force, git reset --hard, DROP TABLE). Quand il bloque quelque chose, affiche un toast, et garde dans la status line un compteur des actions bloquées.

**cockpit**

> Crée un mod "cockpit" : un panneau live à côté de la conversation qui affiche, pour cette session, le nombre de tours, d'appels d'outils et de tokens, un histogramme des outils les plus utilisés, la durée de chaque tour en barres, et la liste des derniers fichiers modifiés. Ajoute une commande /cockpit pour l'ouvrir.

## ⚠️ À savoir

- **Lis le code d'un mod avant de l'installer** : un mod tourne *dans* Claude Code et voit tes prompts, tes outils et tes fichiers. Ceux-ci sont courts : lis-les 🙂
- **Early access** : l'API des mods peut changer d'une version de Claude Code à l'autre.
- **Garde-fou, pas coffre-fort** : le garde du corps bloque les cas évidents, pas toutes les variantes possibles. Ne compte pas uniquement sur lui pour protéger de vrais secrets de production.

## Liens

- 🎬 [La vidéo : Claude Mods](https://youtu.be/_Hllg5sDhFo)
- 👥 Communauté : [Skool (gratuit)](https://shorturl.at/gAGbV) · [Discord](https://cc-france.org) · Instagram [@claudecodefrance](https://instagram.com/claudecodefrance)
- 📞 Formation entreprise / coaching : [Calendly](https://calendly.com/claudecodefrance)
- 📚 [Doc officielle des mods](https://code.claude.com/docs/en/plugins/mods/overview)

Licence MIT.
