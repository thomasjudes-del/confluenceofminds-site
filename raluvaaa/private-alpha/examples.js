(function(){
'use strict';
// Authored example cards, not people or activity. IDs are independent of language
// and deliberately do not reuse the old generated sim-* histories.
const prefix='alpha-example-v1-';
const card=(id,root,kind,parent,en,fr)=>Object.freeze({
  semanticId:prefix+id,lineageId:prefix+'lineage-'+root,kind,
  parentSemanticId:parent?prefix+parent:null,text:Object.freeze({en,fr})
});
window.RALUVAAA_CURATED_EXAMPLES=Object.freeze({version:1,nodes:Object.freeze([
  card('bees','bees','create',null,
    'I want to understand the bees that visit my garden.',
    'Je veux mieux connaître les abeilles qui visitent mon jardin.'),
  card('garden-bees','bees','split','bees',
    'Identify the bee species that visit my garden.',
    'Identifier les espèces d’abeilles qui visitent mon jardin.'),
  card('first-bee-photo','bees','split','garden-bees',
    'Photograph a first bee clearly enough to compare it with an identification guide.',
    'Photographier une première abeille assez nettement pour la comparer à un guide d’identification.'),
  card('seasonal-cooking','seasonal-cooking','create',null,
    'I want to cook simple meals with seasonal vegetables.',
    'Je veux cuisiner des repas simples avec des légumes de saison.'),
  card('vegetable-dish','seasonal-cooking','split','seasonal-cooking',
    'Learn one vegetable dish I can cook without following a recipe.',
    'Apprendre un plat de légumes que je pourrai cuisiner sans suivre une recette.'),
  card('guitar','guitar','create',null,
    'I want to learn to play the guitar.',
    'Je veux apprendre à jouer de la guitare.'),
  card('guitar-song','guitar','evolve','guitar',
    'I now want to sing and accompany one whole song on guitar, rather than learn solo guitar.',
    'Je veux maintenant chanter une chanson entière en m’accompagnant à la guitare, plutôt qu’apprendre la guitare solo.'),
  card('bicycle','bicycle','create',null,
    'I want to keep my bicycle running by doing simple repairs myself.',
    'Je veux entretenir mon vélo en faisant moi-même les réparations simples.'),
  card('puncture','bicycle','split','bicycle',
    'Learn to find and patch a puncture in a bicycle inner tube.',
    'Apprendre à repérer et à réparer une crevaison dans une chambre à air de vélo.'),
  card('constellations','constellations','create',null,
    'I want to recognise three constellations in the night sky.',
    'Je veux reconnaître trois constellations dans le ciel nocturne.')
])});
})();
