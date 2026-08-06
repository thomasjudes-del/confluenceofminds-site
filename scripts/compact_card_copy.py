from pathlib import Path

path = Path("index.html")
html = path.read_text(encoding="utf-8")

replacements = {
    "A weekly collaborative science-fiction game. Choose a role, face a shared incident, and protect the colony while Sybille keeps part of the score hidden.": "A science-fiction game.",
    "The stage for the best, weirdest and most impressive AI creations on the internet. Submit an act, get selected, and face the public vote.": "The online talent show for AI creations.",
    "Loved <em>Shōgun</em>? Get lost in the history, rituals, objects, aesthetics and codes behind its world, through a visual series inspired by Japanese ink painting.": "The culture behind <em>Shōgun</em>.",
    "A confrontational series placing human technical power beside the social, ecological and moral problems we still fail—or refuse—to solve.": "Human power. Collective paralysis.",
    "Dragons are not natural creatures, but remnants of ancient human experiments. An epic world where biology, myth, lost ecosystems and genetic memory collide.": "Dragons born from ancient human experiments.",
    "After strangers attack him in the steppes, Argan—an orphan from Kashgar—is drawn into a brutal initiation among Novices with strange powers, millennial magic, and a Guild whose apparent order hides betrayal and corruption.": "A high-fantasy initiation in Kashgar.",
    "Amnesiac writer Martin Protus discovers that every manuscript he submits already exists—published by algorithms. A vertiginous story about plagiarism, memory, guilt and the possibility that the book itself was written by a machine.": "A psychological thriller about authorship and algorithms.",
    "As an unbearable heatwave strikes Earth, Hakim must re-enter Gamana—an unstable game-world—to find his missing associate Katephomi Kitembe and the plan that may still stop the catastrophe.": "A climate adventure inside an unstable game-world.",
    "Original “films sonores”, adaptations, science fiction, drama and comedy built from actors, music and immersive sound design—from <em>Zone Aphotique</em> to <em>Crime sur la Croisette</em>.": "Immersive films made entirely from sound.",
    "A visual challenge built for play and discovery: identify books hidden inside impossible images, clues and collages.": "Find the books hidden inside the image.",
    "native-media-v4.css?v=20260806-native-v2": "native-media-v4.css?v=20260806-native-v3",
}

for old, new in replacements.items():
    if old not in html:
        raise RuntimeError(f"Expected text not found: {old[:80]}")
    html = html.replace(old, new, 1)

path.write_text(html, encoding="utf-8")
