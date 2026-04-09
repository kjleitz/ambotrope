export interface Quote {
  text: string;
  author: string;
  source?: string;
}

export const QUOTES: Quote[] = [
  {
    text: "The sky is now indelible ink,\nThe branches reft asunder;\nBut you and I we do not shrink;\nWe love the lovely thunder.",
    author: "Ogden Nash",
    source: "A Watched Example Never Boils",
  },
  {
    text: "Let there be gall enough in thy ink, though thou write with a goose-pen, no matter.",
    author: "William Shakespeare",
    source: "Twelfth Night",
  },
  {
    text: "This conference was worse than a Rorschach test: There\u2019s a meaningless inkblot, and the others ask you what you think you see, but when you tell them, they start arguing with you!",
    author: "Richard Feynman",
    source: "Surely You\u2019re Joking, Mr. Feynman!",
  },
  {
    text: "I very much enjoyed your delightful explanation of the formation of meanders. It just happens that my wife had asked me about the \u201cteacup phenomenon\u201d a few days earlier, but I did not know a rational explanation. She says that she will never stir her tea again without thinking of you.",
    author: "Erwin Schr\u00f6dinger to Albert Einstein",
    source: "23 April 1926",
  },
  {
    text: "The simplest migraine hallucinations, as we have said, are phosphenes\u2014simple, almost structureless, moving lights in the visual field. Phosphenes virtually identical to these are readily elicited by direct electrical stimulation of the visual cortex, either in the primary area (Brodmann area) or the surrounding visual association cortex.",
    author: "Oliver Sacks",
    source: "Migraine",
  },
  {
    text: "Then purg\u2019d with euphrasy and rue\nThe visual nerve, for he had much to see.",
    author: "John Milton",
    source: "Paradise Lost",
  },
  {
    text: "From now on, everything in life will appear blurry to me. What\u2019s the point of wiping my glasses when my vision has already left me?",
    author: "Sanu Sharma",
    source: "Pari",
  },
  {
    text: "Vision is the Art of seeing Things invisible.",
    author: "Jonathan Swift",
    source: "Thoughts on Various Subjects",
  },
  {
    text: "And finds with keen, discriminating sight,\nBlack\u2019s not so black\u2014nor white so very white.",
    author: "George Canning",
    source: "New Morality",
  },
  {
    text: "Two men look out through the same bars:\nOne sees the mud, and one the stars.",
    author: "Frederick Langbridge",
    source: "In A Cluster of Quiet Thoughts",
  },
  {
    text: "Everything you see or hear or experience in any way at all is specific to you. You create a universe by perceiving it, so everything in the universe you perceive is specific to you.",
    author: "Douglas Adams",
    source: "Mostly Harmless",
  },
  {
    text: "It is one of the commonest of mistakes to consider that the limit of our power of perception is also the limit of all there is to perceive.",
    author: "C. W. Leadbeater",
    source: "The Chakras",
  },
  {
    text: "What is light to us is darkness to certain insects, and the eye of the clairvoyant sees illumination where the normal eye perceives only blackness.",
    author: "H.P. Blavatsky",
    source: "The Secret Doctrine Volume I",
  },
  {
    text: "In psychoanalysis nothing is true except the exaggerations.",
    author: "Theodor Adorno",
    source: "Minima Moralia",
  },
  {
    text: "Mind is infinite and self-ruled, and is mixed with nothing, but is alone itself by itself.",
    author: "Anaxagoras",
  },
  {
    text: "Mind is the first and most direct thing in our experience; all else is remote inference.",
    author: "Arthur Eddington",
    source: "Science and the Unseen World",
  },
  {
    text: "If you think about it, the inside of your own mind is the only thing you can be sure of.",
    author: "Thomas Nagel",
    source: "What Does It All Mean?",
  },
  {
    text: "The more complex the mind, the greater the need for the simplicity of play.",
    author: "Captain Kirk",
    source: "Star Trek, \"Shore Leave\"",
  },
  {
    text: "Imagination is the air of mind.",
    author: "Philip James Bailey",
    source: "Festus",
  },
  {
    text: "Why does the eye see a thing more clearly in dreams than with the imagination being awake?",
    author: "Leonardo da Vinci",
  },
  {
    text: "I believe in intuition and inspiration. Imagination is more important than knowledge. For knowledge is limited, whereas imagination embraces the entire world, stimulating progress, giving birth to evolution.",
    author: "Albert Einstein",
    source: "Cosmic Religion",
  },
  {
    text: "Dreaming is not merely an act of communication; it is also an aesthetic activity, a game of the imagination, a game that is a value in itself.",
    author: "Milan Kundera",
    source: "The Unbearable Lightness of Being",
  },
  {
    text: "For me, reason is the natural organ of truth; but imagination is the organ of meaning. Imagination, producing new metaphors or revivifying old, is not the cause of truth, but its condition.",
    author: "C.S. Lewis",
    source: "Selected Literary Essays",
  },
  {
    text: "I have imagination, and nothing that is real is alien to me.",
    author: "George Santayana",
    source: "Little Essays",
  },
  {
    text: "This is the dimension of imagination. It is an area which we call the Twilight Zone.",
    author: "Rod Serling",
    source: "The Twilight Zone",
  },
  {
    text: "Imagination is the beginning of creation. You imagine what you desire; you will what you imagine; and at last you create what you will.",
    author: "George Bernard Shaw",
    source: "Back to Methuselah",
  },
  {
    text: "And as imagination bodies forth\nThe forms of things unknown, the poet\u2019s pen\nTurns them to shapes and gives to airy nothing\nA local habitation and a name.",
    author: "William Shakespeare",
    source: "A Midsummer Night\u2019s Dream",
  },
  {
    text: "The imagination is the power that enables us to perceive the normal in the abnormal, the opposite of chaos in chaos.",
    author: "Wallace Stevens",
    source: "The Necessary Angel",
  },
  {
    text: "This world is but canvas to our imaginations.",
    author: "Henry David Thoreau",
    source: "A Week on the Concord and Merrimack Rivers",
  },
  {
    text: "He paints a dolphin in the woods, and a boar in the waves.",
    author: "Horace",
    source: "Ars Poetica",
  },
  {
    text: "My guessing game is strong\nWay too real to be wrong",
    author: "Lady Gaga, Kevin Parker, Mark Ronson, and BloodPop",
    source: "Perfect Illusion",
  },
  {
    text: "I agree that clouds often look like other things \u2014 fish and unicorns and men on horseback \u2014 but they are really only clouds. Even when the lightning flashes inside them we say they are only clouds and turn our attention to the next meal, the next pain, the next breath, the next page. This is how we go on.",
    author: "Stephen King",
    source: "Bag of Bones",
  },
  {
    text: "Do you see yonder cloud, that\u2019s almost in shape of a camel?\nBy the mass, and \u2019tis like a camel, indeed.\nMethinks it is like a weasel.\nIt is backed like a weasel.\nOr, like a whale?\nVery like a whale.",
    author: "William Shakespeare",
    source: "Hamlet",
  },
  {
    text: "Have you ever, looking up, seen a cloud like to a Centaur, a Pard, or a Wolf, or a Bull?",
    author: "Aristophanes",
    source: "Clouds",
  },
];

export function randomQuote(): Quote {
  return QUOTES[Math.floor(Math.random() * QUOTES.length)];
}
