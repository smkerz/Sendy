import { useEffect, useState, useCallback, useRef, Platform } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity, TextInput, AppState } from 'react-native';

// Text-to-speech
let Speech = null;
if (Platform.OS !== 'web') {
  Speech = require('expo-speech');
}

// Speech recognition (native)
let SpeechRecognitionModule = null;
if (Platform.OS !== 'web') {
  try {
    SpeechRecognitionModule = require('expo-speech-recognition');
  } catch (e) {
    SpeechRecognitionModule = null;
  }
}

// Notifications natives (iOS/Android uniquement)
let Notifications = null;
if (Platform.OS !== 'web') {
  Notifications = require('expo-notifications');
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

// AsyncStorage pour iOS/Android, localStorage pour le web
const Storage = {
  getItem: async (key) => {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    }
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    return AsyncStorage.getItem(key);
  },
  setItem: async (key, value) => {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
      return;
    }
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    return AsyncStorage.setItem(key, value);
  },
};

const WORDS = [
  { ru: 'Яда', fr: 'poison' },
  { ru: 'Существует', fr: 'existe' },
  { ru: 'Путь', fr: 'chemin, voie' },
  { ru: 'Башня', fr: 'tour' },
  { ru: 'Рассчитывать', fr: 'compter' },
  { ru: 'Малявкой', fr: 'petit, baby' },
  { ru: 'Прощаться', fr: 'dire au revoir' },
  { ru: 'Расследование', fr: 'investigation' },
  { ru: 'Мой собственной', fr: 'mon propre' },
  { ru: 'Отшельник', fr: 'ermite' },
  { ru: 'Приказ', fr: 'ordre' },
  { ru: 'Тумана', fr: 'brouillard' },
  { ru: 'Трюм', fr: 'cale' },
  { ru: 'Прячусь', fr: 'se cacher' },
  { ru: 'Пещера', fr: 'grotte' },
  { ru: 'Зловещий', fr: 'sinistre' },
  { ru: 'Сущность', fr: 'essence' },
  { ru: 'Принять', fr: 'adopter, accepter' },
  { ru: 'Мешать', fr: 'empecher, perturber' },
  { ru: 'Ракушка', fr: 'coquillage' },
  { ru: 'Украсть', fr: 'voler' },
  { ru: 'Гибкий', fr: 'souple' },
  { ru: 'Перевести стрелки', fr: 'rejeter la faute' },
  { ru: 'Гораздо', fr: 'beaucoup' },
  { ru: 'Привлекательный', fr: 'attrayant' },
  { ru: 'Унижать', fr: 'humilier' },
  { ru: 'Собралась', fr: 'se reunir' },
  { ru: 'Корабль', fr: 'navire' },
  { ru: 'Разочаровываться', fr: 'decevoir' },
  { ru: 'Долг', fr: 'dette' },
  { ru: 'Кузнец', fr: 'forgeron' },
  { ru: 'Близко', fr: 'proche' },
  { ru: 'Гнев', fr: 'colere' },
  { ru: 'Крыса', fr: 'rat' },
  { ru: 'Настроить', fr: 'configurer' },
  { ru: 'Отлавливать', fr: 'attraper' },
  { ru: 'Впечатляющий', fr: 'impressionant' },
  { ru: 'Недооценивать', fr: 'sous-estimer' },
  { ru: 'Сквозь', fr: 'a travers' },
  { ru: 'Пропуск', fr: 'laissez-passer' },
  { ru: 'Лягушка', fr: 'grenouille' },
  { ru: 'Сожалеть', fr: 'regretter' },
  { ru: 'Пусто', fr: 'vide' },
  { ru: 'Радуга', fr: 'arc-en-ciel' },
  { ru: 'Гнездо', fr: 'nid' },
  { ru: 'Вождь', fr: 'chef' },
  { ru: 'Особое', fr: 'particulier' },
  { ru: 'Глубокий', fr: 'profond' },
  { ru: 'Дворец', fr: 'palais' },
  { ru: 'Осколок', fr: 'eclat' },
  { ru: 'Грабеж', fr: 'pillage' },
  { ru: 'Пластина', fr: 'plaque' },
  { ru: 'Достойно', fr: 'dignement' },
  { ru: 'Судьбой', fr: 'destin' },
  { ru: 'Взорвать', fr: 'faire exploser' },
  { ru: 'Наблюдение', fr: 'observation' },
  { ru: 'Отчет', fr: 'rapport' },
  { ru: 'Оковы', fr: 'chaine' },
  { ru: 'Способностей', fr: 'capacite' },
  { ru: 'Взбодрить', fr: 'remonter le moral' },
  { ru: 'Измерения', fr: 'mesures' },
];

// Exemples : phrase russe + traduction francaise pour chaque mot
const EXAMPLES = {
  'Яда': { ru: 'Это сильный яд.', fr: 'C est un poison puissant.' },
  'Существует': { ru: 'Такая книга существует.', fr: 'Un tel livre existe.' },
  'Путь': { ru: 'Долгий путь домой.', fr: 'Un long chemin vers la maison.' },
  'Башня': { ru: 'Эйфелева башня в Париже.', fr: 'La tour Eiffel est a Paris.' },
  'Рассчитывать': { ru: 'Я рассчитываю на тебя.', fr: 'Je compte sur toi.' },
  'Малявкой': { ru: 'Он был малявкой в школе.', fr: 'Il etait un petit gamin a l ecole.' },
  'Прощаться': { ru: 'Пора прощаться.', fr: 'Il est temps de dire au revoir.' },
  'Расследование': { ru: 'Полиция ведёт расследование.', fr: 'La police mene une enquete.' },
  'Мой собственной': { ru: 'У меня свой собственный дом.', fr: 'J ai ma propre maison.' },
  'Отшельник': { ru: 'Он живёт как отшельник.', fr: 'Il vit comme un ermite.' },
  'Приказ': { ru: 'Я выполняю приказ.', fr: 'J execute l ordre.' },
  'Тумана': { ru: 'Из тумана вышел человек.', fr: 'Un homme est sorti du brouillard.' },
  'Трюм': { ru: 'Ящики стоят в трюме.', fr: 'Les caisses sont dans la cale.' },
  'Прячусь': { ru: 'Я прячусь за деревом.', fr: 'Je me cache derriere l arbre.' },
  'Пещера': { ru: 'В пещере темно.', fr: 'Il fait sombre dans la grotte.' },
  'Зловещий': { ru: 'Зловещий смех в ночи.', fr: 'Un rire sinistre dans la nuit.' },
  'Сущность': { ru: 'В чём сущность проблемы?', fr: 'Quelle est l essence du probleme ?' },
  'Принять': { ru: 'Нужно принять решение.', fr: 'Il faut prendre une decision.' },
  'Мешать': { ru: 'Не мешай мне работать.', fr: 'Ne me derange pas au travail.' },
  'Ракушка': { ru: 'Я нашёл ракушку на пляже.', fr: 'J ai trouve un coquillage sur la plage.' },
  'Украсть': { ru: 'Он попытался украсть кошелёк.', fr: 'Il a essaye de voler le portefeuille.' },
  'Гибкий': { ru: 'У неё гибкое тело.', fr: 'Elle a un corps souple.' },
  'Перевести стрелки': { ru: 'Он всегда переводит стрелки на других.', fr: 'Il rejette toujours la faute sur les autres.' },
  'Гораздо': { ru: 'Это гораздо лучше.', fr: 'C est bien mieux.' },
  'Привлекательный': { ru: 'Это привлекательный дом.', fr: 'C est une maison attrayante.' },
  'Унижать': { ru: 'Не надо унижать людей.', fr: 'Il ne faut pas humilier les gens.' },
  'Собралась': { ru: 'Вся семья собралась за столом.', fr: 'Toute la famille s est reunie a table.' },
  'Корабль': { ru: 'Корабль плывёт в море.', fr: 'Le navire navigue en mer.' },
  'Разочаровываться': { ru: 'Я разочаровываюсь в людях.', fr: 'Je suis decu par les gens.' },
  'Долг': { ru: 'У меня большой долг.', fr: 'J ai une grosse dette.' },
  'Кузнец': { ru: 'Кузнец кует железо.', fr: 'Le forgeron forge le fer.' },
  'Близко': { ru: 'Дом близко к парку.', fr: 'La maison est proche du parc.' },
  'Гнев': { ru: 'Его лицо было полно гнева.', fr: 'Son visage etait plein de colere.' },
  'Крыса': { ru: 'В подвале жила крыса.', fr: 'Un rat vivait dans la cave.' },
  'Настроить': { ru: 'Мне нужно настроить компьютер.', fr: 'Je dois configurer l ordinateur.' },
  'Отлавливать': { ru: 'Кот отлавливает мышей.', fr: 'Le chat attrape les souris.' },
  'Впечатляющий': { ru: 'Это впечатляющий вид.', fr: 'C est une vue impressionante.' },
  'Недооценивать': { ru: 'Не надо недооценивать врага.', fr: 'Il ne faut pas sous-estimer l ennemi.' },
  'Сквозь': { ru: 'Свет проходит сквозь окно.', fr: 'La lumiere passe a travers la fenetre.' },
  'Пропуск': { ru: 'Покажите ваш пропуск.', fr: 'Montrez votre laissez-passer.' },
  'Лягушка': { ru: 'Лягушка сидит на листе.', fr: 'La grenouille est assise sur une feuille.' },
  'Сожалеть': { ru: 'Я сожалею о своих словах.', fr: 'Je regrette mes paroles.' },
  'Пусто': { ru: 'В комнате пусто.', fr: 'La piece est vide.' },
  'Радуга': { ru: 'После дождя появилась радуга.', fr: 'Un arc-en-ciel est apparu apres la pluie.' },
  'Гнездо': { ru: 'Птица построила гнездо.', fr: 'L oiseau a construit un nid.' },
  'Вождь': { ru: 'Вождь племени принял решение.', fr: 'Le chef de la tribu a pris une decision.' },
  'Особое': { ru: 'У него особое место.', fr: 'Il a une place particuliere.' },
  'Глубокий': { ru: 'Это глубокий колодец.', fr: 'C est un puits profond.' },
  'Дворец': { ru: 'Он живёт во дворце.', fr: 'Il vit dans un palais.' },
  'Осколок': { ru: 'На полу лежал осколок стекла.', fr: 'Un eclat de verre etait par terre.' },
  'Грабеж': { ru: 'В городе был грабеж.', fr: 'Il y a eu un pillage en ville.' },
  'Пластина': { ru: 'Это металлическая пластина.', fr: 'C est une plaque metallique.' },
  'Достойно': { ru: 'Он вёл себя достойно.', fr: 'Il s est comporte dignement.' },
  'Судьбой': { ru: 'Это было решено судьбой.', fr: 'C etait ecrit par le destin.' },
  'Взорвать': { ru: 'Они хотели взорвать мост.', fr: 'Ils voulaient faire exploser le pont.' },
  'Наблюдение': { ru: 'Ведётся наблюдение за домом.', fr: 'La maison est sous observation.' },
  'Отчет': { ru: 'Я должен написать отчёт.', fr: 'Je dois ecrire un rapport.' },
  'Оковы': { ru: 'Он сбросил свои оковы.', fr: 'Il a rejete ses chaines.' },
  'Способностей': { ru: 'У неё много способностей.', fr: 'Elle a beaucoup de capacites.' },
  'Взбодрить': { ru: 'Кофе меня взбодрит.', fr: 'Le cafe va me redonner de l energie.' },
  'Измерения': { ru: 'Нужно сделать измерения.', fr: 'Il faut faire des mesures.' },
};

// Conjugaisons des verbes
// aspect: imperfective (present) | perfective (future)
// Ordre present/future : я, ты, он/она, мы, вы, они
// Ordre passe : il, elle, ils/elles
const CONJUGATIONS = {
  'Существует': {
    inf: 'существовать', aspect: 'imperfective',
    present: ['существую', 'существуешь', 'существует', 'существуем', 'существуете', 'существуют'],
    past: ['существовал', 'существовала', 'существовали'],
  },
  'Рассчитывать': {
    inf: 'рассчитывать', aspect: 'imperfective',
    present: ['рассчитываю', 'рассчитываешь', 'рассчитывает', 'рассчитываем', 'рассчитываете', 'рассчитывают'],
    past: ['рассчитывал', 'рассчитывала', 'рассчитывали'],
  },
  'Прощаться': {
    inf: 'прощаться', aspect: 'imperfective',
    present: ['прощаюсь', 'прощаешься', 'прощается', 'прощаемся', 'прощаетесь', 'прощаются'],
    past: ['прощался', 'прощалась', 'прощались'],
  },
  'Прячусь': {
    inf: 'прятаться', aspect: 'imperfective',
    present: ['прячусь', 'прячешься', 'прячется', 'прячемся', 'прячетесь', 'прячутся'],
    past: ['прятался', 'пряталась', 'прятались'],
  },
  'Принять': {
    inf: 'принять', aspect: 'perfective',
    future: ['приму', 'примешь', 'примет', 'примем', 'примете', 'примут'],
    past: ['принял', 'приняла', 'приняли'],
  },
  'Мешать': {
    inf: 'мешать', aspect: 'imperfective',
    present: ['мешаю', 'мешаешь', 'мешает', 'мешаем', 'мешаете', 'мешают'],
    past: ['мешал', 'мешала', 'мешали'],
  },
  'Украсть': {
    inf: 'украсть', aspect: 'perfective',
    future: ['украду', 'украдёшь', 'украдёт', 'украдём', 'украдёте', 'украдут'],
    past: ['украл', 'украла', 'украли'],
  },
  'Унижать': {
    inf: 'унижать', aspect: 'imperfective',
    present: ['унижаю', 'унижаешь', 'унижает', 'унижаем', 'унижаете', 'унижают'],
    past: ['унижал', 'унижала', 'унижали'],
  },
  'Собралась': {
    inf: 'собраться', aspect: 'perfective',
    future: ['соберусь', 'соберёшься', 'соберётся', 'соберёмся', 'соберётесь', 'соберутся'],
    past: ['собрался', 'собралась', 'собрались'],
  },
  'Разочаровываться': {
    inf: 'разочаровываться', aspect: 'imperfective',
    present: ['разочаровываюсь', 'разочаровываешься', 'разочаровывается', 'разочаровываемся', 'разочаровываетесь', 'разочаровываются'],
    past: ['разочаровывался', 'разочаровывалась', 'разочаровывались'],
  },
  'Настроить': {
    inf: 'настроить', aspect: 'perfective',
    future: ['настрою', 'настроишь', 'настроит', 'настроим', 'настроите', 'настроят'],
    past: ['настроил', 'настроила', 'настроили'],
  },
  'Отлавливать': {
    inf: 'отлавливать', aspect: 'imperfective',
    present: ['отлавливаю', 'отлавливаешь', 'отлавливает', 'отлавливаем', 'отлавливаете', 'отлавливают'],
    past: ['отлавливал', 'отлавливала', 'отлавливали'],
  },
  'Недооценивать': {
    inf: 'недооценивать', aspect: 'imperfective',
    present: ['недооцениваю', 'недооцениваешь', 'недооценивает', 'недооцениваем', 'недооцениваете', 'недооценивают'],
    past: ['недооценивал', 'недооценивала', 'недооценивали'],
  },
  'Сожалеть': {
    inf: 'сожалеть', aspect: 'imperfective',
    present: ['сожалею', 'сожалеешь', 'сожалеет', 'сожалеем', 'сожалеете', 'сожалеют'],
    past: ['сожалел', 'сожалела', 'сожалели'],
  },
  'Взорвать': {
    inf: 'взорвать', aspect: 'perfective',
    future: ['взорву', 'взорвёшь', 'взорвёт', 'взорвём', 'взорвёте', 'взорвут'],
    past: ['взорвал', 'взорвала', 'взорвали'],
  },
  'Взбодрить': {
    inf: 'взбодрить', aspect: 'perfective',
    future: ['взбодрю', 'взбодришь', 'взбодрит', 'взбодрим', 'взбодрите', 'взбодрят'],
    past: ['взбодрил', 'взбодрила', 'взбодрили'],
  },
  'Перевести стрелки': {
    inf: 'перевести', aspect: 'perfective',
    future: ['переведу', 'переведёшь', 'переведёт', 'переведём', 'переведёте', 'переведут'],
    past: ['перевёл', 'перевела', 'перевели'],
  },
  'Прощаться': {
    inf: 'прощаться', aspect: 'imperfective',
    present: ['прощаюсь', 'прощаешься', 'прощается', 'прощаемся', 'прощаетесь', 'прощаются'],
    past: ['прощался', 'прощалась', 'прощались'],
  },
};

const VERSION = '2.5.0';
const PRESETS = [5, 10, 15, 30, 60, 120];
const STORAGE_KEY = 'sendy_known_words';
const STORAGE_ENABLED = 'sendy_enabled';
const STORAGE_INTERVAL = 'sendy_interval';
const STORAGE_VOICE = 'sendy_voice';
const STORAGE_USER_WORDS = 'sendy_user_words';
const STORAGE_USER_EXAMPLES = 'sendy_user_examples';

function WordRow({ word, known, expanded, onToggle, onAction, onSpeak, ex }) {
  const conj = CONJUGATIONS[word.ru];
  const pronouns = ['я', 'ты', 'он/она', 'мы', 'вы', 'они'];
  const forms = conj && (conj.present || conj.future);
  const tenseLabel = conj && (conj.present ? 'Present' : 'Futur');

  return (
    <View style={[styles.wordCard, expanded && styles.wordCardExpanded]}>
      <TouchableOpacity style={styles.wordRow} onPress={onToggle} activeOpacity={0.7}>
        <Text style={known ? styles.listItemKnown : styles.listItem}>
          {word.ru} — {word.fr}
          {conj && <Text style={styles.verbTag}> {'  '}(verbe)</Text>}
        </Text>
        <TouchableOpacity onPress={onAction}>
          <Text style={known ? styles.undoBtn : styles.checkBtn}>{known ? 'Remettre' : 'OK'}</Text>
        </TouchableOpacity>
      </TouchableOpacity>
      {expanded && (
        <View style={styles.wordDetail}>
          <TouchableOpacity style={styles.detailListenBtn} onPress={onSpeak}>
            <Text style={styles.detailListenText}>♪ Ecouter</Text>
          </TouchableOpacity>
          {ex && (
            <View style={styles.exampleBox}>
              <Text style={styles.exampleRu}>{ex.ru}</Text>
              <Text style={styles.exampleFr}>{ex.fr}</Text>
            </View>
          )}
          {conj && (
            <View style={styles.conjBox}>
              <Text style={styles.conjTitle}>Conjugaison</Text>
              <Text style={styles.conjInf}>infinitif : {conj.inf} ({conj.aspect === 'perfective' ? 'perfectif' : 'imperfectif'})</Text>
              <Text style={styles.conjSubtitle}>{tenseLabel}</Text>
              {pronouns.map((p, i) => (
                <Text key={p} style={styles.conjLine}>
                  <Text style={styles.conjPron}>{p}</Text>{'  '}{forms[i]}
                </Text>
              ))}
              <Text style={styles.conjSubtitle}>Passe</Text>
              {['il', 'elle', 'ils/elles'].map((p, i) => (
                <Text key={p} style={styles.conjLine}>
                  <Text style={styles.conjPron}>{p}</Text>{'  '}{conj.past[i]}
                </Text>
              ))}
            </View>
          )}
          {!ex && !conj && (
            <Text style={styles.emptyText}>Pas d'exemple ni de conjugaison pour ce mot.</Text>
          )}
        </View>
      )}
    </View>
  );
}

export default function App() {
  const [enabled, setEnabled] = useState(false);
  const [interval, setIntervalVal] = useState(30);
  const [customInterval, setCustomInterval] = useState('');
  const [status, setStatus] = useState('Desactive');
  const [nextWord, setNextWord] = useState(null);
  const [knownWords, setKnownWords] = useState([]);
  const [showKnown, setShowKnown] = useState(false);
  const [expandedWord, setExpandedWord] = useState(null);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [activeTab, setActiveTab] = useState('words'); // 'words' | 'quiz' | 'add' | 'settings'
  const [quizWord, setQuizWord] = useState(null);
  const [quizOptions, setQuizOptions] = useState([]);
  const [quizFeedback, setQuizFeedback] = useState(null);
  const [quizScore, setQuizScore] = useState({ correct: 0, total: 0 });
  const [userWords, setUserWords] = useState([]);
  const [userExamples, setUserExamples] = useState({}); // { ru: {ru, fr} }
  const [newRu, setNewRu] = useState('');
  const [newFr, setNewFr] = useState('');
  const [newExRu, setNewExRu] = useState('');
  const [newExFr, setNewExFr] = useState('');
  const [exSearchResults, setExSearchResults] = useState([]);
  const [searchingEx, setSearchingEx] = useState(false);
  const [ruSuggestions, setRuSuggestions] = useState([]);
  const [frSuggestions, setFrSuggestions] = useState([]);
  const [listening, setListening] = useState(null);
  const webTimerRef = useRef(null);
  const recognitionRef = useRef(null);

  // Liste combinee : mots de base + mots utilisateur
  const ALL_WORDS = [...WORDS, ...userWords];

  // Lookup exemple : userExamples surcharge EXAMPLES
  const getExample = (ru) => userExamples[ru] || EXAMPLES[ru] || null;

  // Generer une question de quiz
  const generateQuiz = useCallback(() => {
    if (ALL_WORDS.length < 5) return;
    const correctIdx = Math.floor(Math.random() * ALL_WORDS.length);
    const correct = ALL_WORDS[correctIdx];
    const others = ALL_WORDS.filter((_, i) => i !== correctIdx);
    const shuffled = [...others].sort(() => Math.random() - 0.5).slice(0, 4);
    const options = [...shuffled, correct].sort(() => Math.random() - 0.5);
    setQuizWord(correct);
    setQuizOptions(options);
    setQuizFeedback(null);
  }, [ALL_WORDS]);

  const answerQuiz = (option) => {
    if (quizFeedback) return; // deja repondu
    const isCorrect = option.ru === quizWord.ru;
    setQuizFeedback(isCorrect ? 'correct' : 'wrong');
    setQuizScore((s) => ({ correct: s.correct + (isCorrect ? 1 : 0), total: s.total + 1 }));
    if (voiceEnabled) speakWord(quizWord);
  };

  // Generer la premiere question quand on arrive sur l'onglet
  useEffect(() => {
    if (activeTab === 'quiz' && !quizWord) generateQuiz();
  }, [activeTab, quizWord, generateQuiz]);

  // --- Reconnaissance vocale (web + natif) ---
  const handleResults = (lang, alternatives) => {
    const unique = [...new Set(alternatives.filter(Boolean))];
    if (lang === 'ru') {
      setRuSuggestions(unique);
      if (unique[0]) setNewRu(unique[0]);
    } else {
      setFrSuggestions(unique);
      if (unique[0]) setNewFr(unique[0]);
    }
  };

  const startListening = async (lang) => {
    if (lang === 'ru') setRuSuggestions([]);
    if (lang === 'fr') setFrSuggestions([]);

    if (Platform.OS === 'web') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        alert("Ton navigateur ne supporte pas la reconnaissance vocale. Essaye Safari ou Chrome.");
        return;
      }
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      }
      const recognition = new SpeechRecognition();
      recognition.lang = lang === 'ru' ? 'ru-RU' : 'fr-FR';
      recognition.maxAlternatives = 5;
      recognition.continuous = false;
      recognition.interimResults = false;

      setListening(lang);

      recognition.onresult = (event) => {
        const result = event.results[0];
        const alternatives = [];
        for (let i = 0; i < result.length; i++) {
          alternatives.push(result[i].transcript);
        }
        handleResults(lang, alternatives);
      };
      recognition.onerror = (event) => {
        setListening(null);
        if (event.error !== 'no-speech') {
          alert('Erreur reconnaissance : ' + event.error);
        }
      };
      recognition.onend = () => setListening(null);

      recognitionRef.current = recognition;
      try {
        recognition.start();
      } catch (e) {
        setListening(null);
        alert('Erreur : ' + e.message);
      }
      return;
    }

    // --- iOS / Android natif ---
    if (!SpeechRecognitionModule) {
      alert('Module non charge. Reinstalle la derniere version (v' + VERSION + ') de l app.');
      return;
    }

    const ESR = SpeechRecognitionModule.ExpoSpeechRecognitionModule || SpeechRecognitionModule.default || SpeechRecognitionModule;
    const addListener = SpeechRecognitionModule.addSpeechRecognitionListener || (ESR && ESR.addListener && ESR.addListener.bind(ESR));

    if (!ESR || typeof ESR.start !== 'function') {
      alert('API speech recognition introuvable. Cle disponibles : ' + Object.keys(SpeechRecognitionModule).join(', '));
      return;
    }
    if (typeof addListener !== 'function') {
      alert('addListener introuvable. Cles : ' + Object.keys(SpeechRecognitionModule).join(', '));
      return;
    }

    try {
      let perm = { granted: true };
      if (typeof ESR.requestPermissionsAsync === 'function') {
        perm = await ESR.requestPermissionsAsync();
      }
      if (perm && perm.granted === false) {
        alert('Permission refusee. Active micro + dictee dans Reglages > Sendy.');
        return;
      }

      const subs = [];
      const cleanup = () => {
        subs.forEach((s) => { try { s.remove(); } catch (e) {} });
        subs.length = 0;
        setListening(null);
      };

      // Diagnostic : on capture TOUS les events
      let debugLog = [];
      const events = ['result', 'end', 'error', 'start', 'speechstart', 'speechend', 'audiostart', 'audioend', 'nomatch'];
      events.forEach((name) => {
        try {
          subs.push(addListener(name, (event) => {
            const summary = name + ': ' + (event ? JSON.stringify(event).slice(0, 150) : 'no event');
            debugLog.push(summary);
            if (name === 'result' && event && event.results && event.results.length) {
              const transcripts = event.results.map((r) => r.transcript || r);
              handleResults(lang, transcripts);
            }
            if (name === 'error') {
              cleanup();
              alert('LOG:\n' + debugLog.join('\n'));
            }
            if (name === 'end') {
              cleanup();
              if (debugLog.filter((l) => l.startsWith('result')).length === 0) {
                alert('Aucun result event recu. LOG:\n' + debugLog.join('\n'));
              }
            }
          }));
        } catch (e) {}
      });

      setListening(lang);
      ESR.start({
        lang: lang === 'ru' ? 'ru-RU' : 'fr-FR',
        interimResults: false,
        maxAlternatives: 5,
        continuous: false,
        requiresOnDeviceRecognition: false,
        addsPunctuation: false,
      });
    } catch (e) {
      setListening(null);
      alert('Exception : ' + (e && e.message ? e.message : String(e)));
    }
  };

  const addUserWord = () => {
    const ru = newRu.trim();
    const fr = newFr.trim();
    if (!ru || !fr) {
      alert('Remplis le mot russe ET la traduction francaise');
      return;
    }
    if (ALL_WORDS.some((w) => w.ru === ru)) {
      alert('Ce mot existe deja');
      return;
    }
    setUserWords([...userWords, { ru, fr }]);

    // Sauvegarder l'exemple si l'utilisateur en a saisi/selectionne un
    const exRu = newExRu.trim();
    const exFr = newExFr.trim();
    if (exRu && exFr) {
      setUserExamples({ ...userExamples, [ru]: { ru: exRu, fr: exFr } });
    }

    setNewRu('');
    setNewFr('');
    setNewExRu('');
    setNewExFr('');
    setRuSuggestions([]);
    setFrSuggestions([]);
    setExSearchResults([]);
  };

  const deleteUserWord = (ru) => {
    setUserWords(userWords.filter((w) => w.ru !== ru));
    const next = { ...userExamples };
    delete next[ru];
    setUserExamples(next);
  };

  const speakWord = useCallback((word) => {
    if (!voiceEnabled || !word) return;
    if (Platform.OS === 'web') {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const u1 = new window.SpeechSynthesisUtterance(word.ru);
        u1.lang = 'ru-RU';
        const u2 = new window.SpeechSynthesisUtterance(word.fr);
        u2.lang = 'fr-FR';
        window.speechSynthesis.speak(u1);
        window.speechSynthesis.speak(u2);
      }
    } else if (Speech) {
      Speech.stop();
      Speech.speak(word.ru, { language: 'ru-RU' });
      Speech.speak(word.fr, { language: 'fr-FR' });
    }
  }, [voiceEnabled]);

  // Charger les donnees sauvegardees au lancement
  useEffect(() => {
    Storage.getItem(STORAGE_KEY).then((data) => {
      if (data) setKnownWords(JSON.parse(data));
    });
    Storage.getItem(STORAGE_ENABLED).then((data) => {
      if (data === 'true') setEnabled(true);
    });
    Storage.getItem(STORAGE_INTERVAL).then((data) => {
      if (data) setIntervalVal(parseInt(data, 10));
    });
    Storage.getItem(STORAGE_VOICE).then((data) => {
      if (data === 'false') setVoiceEnabled(false);
    });
    Storage.getItem(STORAGE_USER_WORDS).then((data) => {
      if (data) setUserWords(JSON.parse(data));
    });
    Storage.getItem(STORAGE_USER_EXAMPLES).then((data) => {
      if (data) setUserExamples(JSON.parse(data));
    });
  }, []);

  useEffect(() => {
    Storage.setItem(STORAGE_USER_WORDS, JSON.stringify(userWords));
  }, [userWords]);

  useEffect(() => {
    Storage.setItem(STORAGE_USER_EXAMPLES, JSON.stringify(userExamples));
  }, [userExamples]);

  // Recherche d'exemples sur Tatoeba (base gratuite, sans cle)
  const searchExample = async () => {
    const query = newRu.trim();
    if (!query) {
      alert('Entre d abord le mot russe');
      return;
    }
    setSearchingEx(true);
    setExSearchResults([]);
    try {
      const url = `https://tatoeba.org/en/api_v0/search?query=${encodeURIComponent(query)}&from=rus&to=fra&sort=random`;
      const response = await fetch(url);
      const data = await response.json();
      const results = (data.results || []).map((r) => {
        const trans = r.translations && r.translations[0] && r.translations[0].find((t) => t.lang === 'fra');
        return { ru: r.text, fr: trans ? trans.text : '' };
      }).filter((r) => r.fr).slice(0, 5);
      if (results.length === 0) {
        alert('Aucune phrase trouvee pour "' + query + '"');
      }
      setExSearchResults(results);
    } catch (e) {
      alert('Erreur recherche : ' + e.message);
    } finally {
      setSearchingEx(false);
    }
  };

  useEffect(() => {
    Storage.setItem(STORAGE_VOICE, voiceEnabled.toString());
  }, [voiceEnabled]);

  // Sauvegarder les mots connus
  useEffect(() => {
    Storage.setItem(STORAGE_KEY, JSON.stringify(knownWords));
  }, [knownWords]);

  // Sauvegarder l'etat ON/OFF et l'intervalle
  useEffect(() => {
    Storage.setItem(STORAGE_ENABLED, enabled.toString());
  }, [enabled]);

  useEffect(() => {
    Storage.setItem(STORAGE_INTERVAL, interval.toString());
  }, [interval]);

  const activeWords = ALL_WORDS.filter((w) => !knownWords.includes(w.ru));

  const markAsKnown = (ruWord) => {
    if (!knownWords.includes(ruWord)) {
      setKnownWords([...knownWords, ruWord]);
    }
  };

  const markAsUnknown = (ruWord) => {
    setKnownWords(knownWords.filter((w) => w !== ruWord));
  };

  const getRandomWord = useCallback((words) => {
    if (words.length === 0) return null;
    return words[Math.floor(Math.random() * words.length)];
  }, []);

  // --- Notifications natives (iOS/Android) ---
  const scheduleNativeNotifications = useCallback(async (minutes, words) => {
    if (!Notifications || words.length === 0) return;

    await Notifications.cancelAllScheduledNotificationsAsync();

    const maxNotifs = Math.min(Math.floor(1440 / minutes), 64);
    for (let i = 1; i <= maxNotifs; i++) {
      const word = words[Math.floor(Math.random() * words.length)];
      const ex = getExample(word.ru);
      const conj = CONJUGATIONS[word.ru];
      let body = ex ? `${word.fr}\n\n${ex.ru}\n${ex.fr}` : word.fr;
      if (conj) body += `\n\n(verbe - ouvre l'app pour la conjugaison)`;
      await Notifications.scheduleNotificationAsync({
        content: {
          title: word.ru,
          body,
          data: { ru: word.ru, fr: word.fr, exRu: ex ? ex.ru : null, exFr: ex ? ex.fr : null },
          sound: true,
        },
        trigger: {
          type: 'timeInterval',
          seconds: i * minutes * 60,
          repeats: false,
        },
      });
    }
  }, []);

  // --- Notifications web (navigateur) ---
  const sendWebNotification = useCallback((word) => {
    if (Platform.OS !== 'web') return;
    const ex = getExample(word.ru);
    const body = ex ? `${word.fr}\n\n${ex.ru}\n${ex.fr}` : word.fr;
    if ('Notification' in window && window.Notification.permission === 'granted') {
      new window.Notification(word.ru, { body });
    }
    setNextWord({ ...word, ex });
  }, []);

  const startWebTimer = useCallback((minutes, words) => {
    if (webTimerRef.current) clearInterval(webTimerRef.current);
    if (words.length === 0) return;

    webTimerRef.current = setInterval(() => {
      const word = words[Math.floor(Math.random() * words.length)];
      sendWebNotification(word);
    }, minutes * 60 * 1000);
  }, [sendWebNotification]);

  const stopWebTimer = useCallback(() => {
    if (webTimerRef.current) {
      clearInterval(webTimerRef.current);
      webTimerRef.current = null;
    }
  }, []);

  // Demander la permission
  useEffect(() => {
    if (Platform.OS === 'web') {
      if ('Notification' in window && window.Notification.permission === 'default') {
        window.Notification.requestPermission();
      }
    } else if (Notifications) {
      Notifications.requestPermissionsAsync();
    }
  }, []);

  // Reagir au ON/OFF, intervalle, mots actifs
  useEffect(() => {
    if (enabled) {
      if (activeWords.length === 0) {
        setStatus('Tous les mots sont connus !');
        return;
      }

      if (Platform.OS === 'web') {
        startWebTimer(interval, activeWords);
        setStatus(`Actif — toutes les ${interval} min (${activeWords.length} mots)`);
      } else {
        scheduleNativeNotifications(interval, activeWords);
        const maxNotifs = Math.min(Math.floor(1440 / interval), 64);
        setStatus(`${maxNotifs} notifications / ${interval} min (${activeWords.length} mots)`);
      }

      const first = getRandomWord(activeWords);
      if (first) setNextWord({ ...first, ex: getExample(first.ru) });
    } else {
      if (Platform.OS === 'web') {
        stopWebTimer();
      } else if (Notifications) {
        Notifications.cancelAllScheduledNotificationsAsync();
      }
      setStatus('Desactive');
    }

    return () => {
      if (Platform.OS === 'web') stopWebTimer();
    };
  }, [enabled, interval, knownWords.length]);

  // Ecouter les notifications natives
  useEffect(() => {
    if (!Notifications) return;

    const parseNotif = (content) => {
      const { title, data } = content;
      const ru = (data && data.ru) || title;
      const fr = (data && data.fr) || content.body;
      const ex = data && data.exRu ? { ru: data.exRu, fr: data.exFr } : getExample(ru);
      return { ru, fr, ex };
    };

    const sub1 = Notifications.addNotificationReceivedListener((notification) => {
      const w = parseNotif(notification.request.content);
      setNextWord(w);
      speakWord(w);
    });

    const sub2 = Notifications.addNotificationResponseReceivedListener((response) => {
      const w = parseNotif(response.notification.request.content);
      setNextWord(w);
      speakWord(w);
    });

    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) {
        const w = parseNotif(response.notification.request.content);
        setNextWord(w);
        speakWord(w);
      }
    });

    return () => {
      sub1.remove();
      sub2.remove();
    };
  }, [speakWord]);

  // Rappel quand l'app passe en arriere-plan
  useEffect(() => {
    if (!Notifications || Platform.OS === 'web') return;

    const REMINDER_ID = 'sendy-comeback-reminder';

    const handleAppStateChange = async (state) => {
      if (state === 'background') {
        try {
          // Annuler tout rappel existant
          await Notifications.cancelScheduledNotificationAsync(REMINDER_ID).catch(() => {});

          // Planifier un rappel dans 10 minutes
          await Notifications.scheduleNotificationAsync({
            identifier: REMINDER_ID,
            content: {
              title: 'Sendy',
              body: 'Tu n auras plus de mots a apprendre tant que l app est fermee. Reviens vite !',
              sound: true,
            },
            trigger: {
              type: 'timeInterval',
              seconds: 10 * 60,
              repeats: false,
            },
          });
        } catch (e) {}
      } else if (state === 'active') {
        try {
          await Notifications.cancelScheduledNotificationAsync(REMINDER_ID).catch(() => {});
        } catch (e) {}
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, []);

  const selectInterval = (minutes) => {
    setIntervalVal(minutes);
    setCustomInterval('');
  };

  const applyCustomInterval = () => {
    const val = parseInt(customInterval, 10);
    if (val > 0) {
      setIntervalVal(val);
    }
  };

  return (
    <View style={styles.outer}>
    <View style={styles.container}>
      {/* Header avec titre */}
      <Text style={styles.title}>Sendy <Text style={styles.version}>v{VERSION}</Text></Text>

      {/* Onglets principaux */}
      <View style={styles.mainTabRow}>
        <TouchableOpacity
          style={[styles.mainTab, activeTab === 'words' && styles.mainTabActive]}
          onPress={() => setActiveTab('words')}
        >
          <Text style={[styles.mainTabText, activeTab === 'words' && styles.mainTabTextActive]}>
            Mots
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.mainTab, activeTab === 'quiz' && styles.mainTabActive]}
          onPress={() => setActiveTab('quiz')}
        >
          <Text style={[styles.mainTabText, activeTab === 'quiz' && styles.mainTabTextActive]}>
            Quiz
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.mainTab, activeTab === 'add' && styles.mainTabActive]}
          onPress={() => setActiveTab('add')}
        >
          <Text style={[styles.mainTabText, activeTab === 'add' && styles.mainTabTextActive]}>
            Ajouter
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.mainTab, activeTab === 'settings' && styles.mainTabActive]}
          onPress={() => setActiveTab('settings')}
        >
          <Text style={[styles.mainTabText, activeTab === 'settings' && styles.mainTabTextActive]}>
            Reglages
          </Text>
        </TouchableOpacity>
      </View>

      {/* Onglet QUIZ */}
      {activeTab === 'quiz' && quizWord && (
        <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
          <View style={styles.quizScoreRow}>
            <Text style={styles.quizScoreText}>
              Score : {quizScore.correct} / {quizScore.total}
            </Text>
            {quizScore.total > 0 && (
              <Text style={styles.quizScorePct}>
                {Math.round((quizScore.correct / quizScore.total) * 100)} %
              </Text>
            )}
          </View>

          <View style={styles.quizCard}>
            <Text style={styles.quizQuestion}>Que veut dire :</Text>
            <Text style={styles.quizWord}>{quizWord.ru}</Text>
            <TouchableOpacity style={styles.iconBtnSmall} onPress={() => speakWord(quizWord)}>
              <Text style={styles.iconBtnText}>♪ Ecouter</Text>
            </TouchableOpacity>
          </View>

          {quizOptions.map((option, index) => {
            const isCorrect = option.ru === quizWord.ru;
            const showCorrect = quizFeedback && isCorrect;
            const showWrong = quizFeedback === 'wrong' && quizFeedback !== null;
            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.quizOption,
                  showCorrect && styles.quizOptionCorrect,
                  quizFeedback === 'wrong' && !isCorrect && styles.quizOptionWrong,
                ]}
                onPress={() => answerQuiz(option)}
                disabled={!!quizFeedback}
              >
                <Text style={styles.quizOptionText}>{option.fr}</Text>
              </TouchableOpacity>
            );
          })}

          {quizFeedback && (
            <View style={styles.quizFeedback}>
              <Text style={[
                styles.quizFeedbackText,
                quizFeedback === 'correct' ? styles.quizCorrect : styles.quizWrong
              ]}>
                {quizFeedback === 'correct' ? '✓ Correct !' : `✗ La reponse etait : ${quizWord.fr}`}
              </Text>
              <TouchableOpacity style={styles.quizNextBtn} onPress={generateQuiz}>
                <Text style={styles.quizNextBtnText}>Mot suivant →</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}

      {/* Onglet AJOUTER */}
      {activeTab === 'add' && (
        <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
          <Text style={styles.sectionTitle}>Mot russe</Text>
          <View style={styles.addRow}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Ex : Книга"
              placeholderTextColor="#666"
              value={newRu}
              onChangeText={setNewRu}
            />
            <TouchableOpacity
              style={[styles.micBtn, listening === 'ru' && styles.micBtnActive]}
              onPress={() => startListening('ru')}
            >
              <Text style={styles.micBtnText}>{listening === 'ru' ? '...' : '🎤'}</Text>
            </TouchableOpacity>
          </View>

          {ruSuggestions.length > 1 && (
            <View style={styles.suggestionsBox}>
              <Text style={styles.suggestionsLabel}>Tu voulais peut-etre dire :</Text>
              {ruSuggestions.map((sug, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[styles.suggestion, newRu === sug && styles.suggestionActive]}
                  onPress={() => setNewRu(sug)}
                >
                  <Text style={styles.suggestionText}>{sug}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Text style={styles.sectionTitle}>Traduction francaise</Text>
          <View style={styles.addRow}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Ex : livre"
              placeholderTextColor="#666"
              value={newFr}
              onChangeText={setNewFr}
            />
            <TouchableOpacity
              style={[styles.micBtn, listening === 'fr' && styles.micBtnActive]}
              onPress={() => startListening('fr')}
            >
              <Text style={styles.micBtnText}>{listening === 'fr' ? '...' : '🎤'}</Text>
            </TouchableOpacity>
          </View>

          {frSuggestions.length > 1 && (
            <View style={styles.suggestionsBox}>
              <Text style={styles.suggestionsLabel}>Tu voulais peut-etre dire :</Text>
              {frSuggestions.map((sug, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[styles.suggestion, newFr === sug && styles.suggestionActive]}
                  onPress={() => setNewFr(sug)}
                >
                  <Text style={styles.suggestionText}>{sug}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Text style={[styles.sectionTitle, { marginTop: 12 }]}>Phrase d exemple (facultatif)</Text>
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: '#e94560', marginTop: 4, marginBottom: 8 }]}
            onPress={searchExample}
            disabled={searchingEx}
          >
            <Text style={styles.addBtnText}>
              {searchingEx ? 'Recherche...' : 'Chercher un exemple gratuit (Tatoeba)'}
            </Text>
          </TouchableOpacity>

          {exSearchResults.length > 0 && (
            <View style={styles.suggestionsBox}>
              <Text style={styles.suggestionsLabel}>Choisis un exemple :</Text>
              {exSearchResults.map((res, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[styles.suggestion, newExRu === res.ru && styles.suggestionActive]}
                  onPress={() => { setNewExRu(res.ru); setNewExFr(res.fr); }}
                >
                  <Text style={styles.suggestionText}>{res.ru}</Text>
                  <Text style={[styles.suggestionText, { fontSize: 13, color: '#aaa' }]}>{res.fr}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <TextInput
            style={[styles.input, { marginBottom: 6 }]}
            placeholder="Phrase russe"
            placeholderTextColor="#666"
            value={newExRu}
            onChangeText={setNewExRu}
          />
          <TextInput
            style={styles.input}
            placeholder="Traduction francaise"
            placeholderTextColor="#666"
            value={newExFr}
            onChangeText={setNewExFr}
          />

          <TouchableOpacity style={[styles.addBtn, { marginTop: 12 }]} onPress={addUserWord}>
            <Text style={styles.addBtnText}>+ Ajouter le mot</Text>
          </TouchableOpacity>

          {userWords.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { marginTop: 20 }]}>
                Mes mots ajoutes ({userWords.length})
              </Text>
              {userWords.map((word, idx) => (
                <View key={idx} style={styles.wordRow}>
                  <Text style={styles.listItem}>
                    {word.ru} — {word.fr}
                  </Text>
                  <TouchableOpacity onPress={() => deleteUserWord(word.ru)}>
                    <Text style={styles.undoBtn}>Suppr</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </>
          )}
        </ScrollView>
      )}

      {/* Onglet REGLAGES */}
      {activeTab === 'settings' && (
        <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Notifications</Text>
            <Switch
              value={enabled}
              onValueChange={setEnabled}
              trackColor={{ false: '#555', true: '#e94560' }}
              thumbColor={enabled ? '#fff' : '#ccc'}
            />
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Voix</Text>
            <Switch
              value={voiceEnabled}
              onValueChange={setVoiceEnabled}
              trackColor={{ false: '#555', true: '#16c79a' }}
              thumbColor={voiceEnabled ? '#fff' : '#ccc'}
            />
          </View>

          <Text style={styles.sectionTitle}>
            Frequence : toutes les {interval} min
          </Text>
          <View style={styles.presetRow}>
            {PRESETS.map((min) => (
              <TouchableOpacity
                key={min}
                style={[styles.presetBtn, interval === min && styles.presetBtnActive]}
                onPress={() => selectInterval(min)}
              >
                <Text style={[styles.presetText, interval === min && styles.presetTextActive]}>
                  {min < 60 ? `${min}m` : `${min / 60}h`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.customRow}>
            <TextInput
              style={styles.input}
              placeholder="Autre (min)"
              placeholderTextColor="#666"
              keyboardType="numeric"
              value={customInterval}
              onChangeText={setCustomInterval}
            />
            <TouchableOpacity style={styles.applyBtn} onPress={applyCustomInterval}>
              <Text style={styles.applyText}>OK</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.status}>{status}</Text>

          {/* Carte du dernier mot recu */}
          {nextWord && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Dernier mot</Text>
              <Text style={styles.russian}>{nextWord.ru}</Text>
              <Text style={styles.french}>{nextWord.fr}</Text>
              {(nextWord.ex || getExample(nextWord.ru)) && (
                <View style={styles.exampleBox}>
                  <Text style={styles.exampleRu}>{(nextWord.ex || getExample(nextWord.ru)).ru}</Text>
                  <Text style={styles.exampleFr}>{(nextWord.ex || getExample(nextWord.ru)).fr}</Text>
                </View>
              )}
              {CONJUGATIONS[nextWord.ru] && (() => {
                const c = CONJUGATIONS[nextWord.ru];
                const forms = c.present || c.future;
                const tenseLabel = c.present ? 'Present' : 'Futur (perfectif)';
                const pronouns = ['я', 'ты', 'он/она', 'мы', 'вы', 'они'];
                const pastLabels = ['il', 'elle', 'ils/elles'];
                return (
                  <View style={styles.conjBox}>
                    <Text style={styles.conjTitle}>Conjugaison</Text>
                    <Text style={styles.conjInf}>infinitif : {c.inf} ({c.aspect === 'perfective' ? 'perfectif' : 'imperfectif'})</Text>
                    <Text style={styles.conjSubtitle}>{tenseLabel}</Text>
                    {pronouns.map((p, i) => (
                      <Text key={p} style={styles.conjLine}>
                        <Text style={styles.conjPron}>{p}</Text>{'  '}{forms[i]}
                      </Text>
                    ))}
                    <Text style={styles.conjSubtitle}>Passe</Text>
                    {pastLabels.map((p, i) => (
                      <Text key={p} style={styles.conjLine}>
                        <Text style={styles.conjPron}>{p}</Text>{'  '}{c.past[i]}
                      </Text>
                    ))}
                  </View>
                );
              })()}
              <View style={styles.cardBtns}>
                <TouchableOpacity
                  style={styles.listenBtn}
                  onPress={() => speakWord(nextWord)}
                >
                  <Text style={styles.listenBtnText}>Ecouter</Text>
                </TouchableOpacity>
                {!knownWords.includes(nextWord.ru) && (
                  <TouchableOpacity
                    style={styles.knownBtn}
                    onPress={() => markAsKnown(nextWord.ru)}
                  >
                    <Text style={styles.knownBtnText}>Je connais</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        </ScrollView>
      )}

      {/* Onglet MOTS */}
      {activeTab === 'words' && (
        <>

      {/* Onglets */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, !showKnown && styles.tabActive]}
          onPress={() => setShowKnown(false)}
        >
          <Text style={[styles.tabText, !showKnown && styles.tabTextActive]}>
            A apprendre ({activeWords.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, showKnown && styles.tabActive]}
          onPress={() => setShowKnown(true)}
        >
          <Text style={[styles.tabText, showKnown && styles.tabTextActive]}>
            Connus ({knownWords.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Liste des mots */}
      <ScrollView style={styles.list} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={true}>
        {!showKnown ? (
          activeWords.map((word, index) => (
            <WordRow
              key={index}
              word={word}
              known={false}
              expanded={expandedWord === word.ru}
              onToggle={() => setExpandedWord(expandedWord === word.ru ? null : word.ru)}
              onAction={() => markAsKnown(word.ru)}
              onSpeak={() => speakWord(word)}
              ex={getExample(word.ru)}
            />
          ))
        ) : (
          knownWords.length === 0 ? (
            <Text style={styles.emptyText}>Aucun mot connu pour l'instant</Text>
          ) : (
            ALL_WORDS.filter((w) => knownWords.includes(w.ru)).map((word, index) => (
              <WordRow
                key={index}
                word={word}
                known={true}
                expanded={expandedWord === word.ru}
                onToggle={() => setExpandedWord(expandedWord === word.ru ? null : word.ru)}
                onAction={() => markAsUnknown(word.ru)}
                onSpeak={() => speakWord(word)}
                ex={getExample(word.ru)}
              />
            ))
          )
        )}
      </ScrollView>
        </>
      )}
    </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    alignItems: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    paddingTop: 50,
    paddingHorizontal: 16,
    maxWidth: 600,
    width: '100%',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#e94560',
    textAlign: 'center',
    marginBottom: 12,
  },
  version: {
    fontSize: 14,
    fontWeight: 'normal',
    color: '#888',
  },
  mainTabRow: {
    flexDirection: 'row',
    marginBottom: 12,
    backgroundColor: '#16213e',
    borderRadius: 10,
    padding: 4,
  },
  mainTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  mainTabActive: {
    backgroundColor: '#e94560',
  },
  mainTabText: {
    color: '#888',
    fontWeight: 'bold',
    fontSize: 16,
  },
  mainTabTextActive: {
    color: '#ffffff',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  switchLabel: {
    fontSize: 18,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 14,
    color: '#888',
    marginBottom: 8,
  },
  presetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  presetBtn: {
    backgroundColor: '#16213e',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#333',
  },
  presetBtnActive: {
    backgroundColor: '#e94560',
    borderColor: '#e94560',
  },
  presetText: {
    color: '#888',
    fontSize: 15,
    fontWeight: 'bold',
  },
  presetTextActive: {
    color: '#ffffff',
  },
  customRow: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#16213e',
    borderRadius: 10,
    padding: 12,
    color: '#ffffff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  applyBtn: {
    backgroundColor: '#e94560',
    borderRadius: 10,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  applyText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  status: {
    fontSize: 14,
    color: '#16c79a',
    textAlign: 'center',
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#16213e',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e94560',
  },
  russian: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  french: {
    fontSize: 20,
    color: '#16c79a',
    marginBottom: 12,
  },
  wordCard: {
    marginBottom: 4,
    borderRadius: 8,
    overflow: 'hidden',
  },
  wordCardExpanded: {
    backgroundColor: '#16213e',
    marginBottom: 10,
  },
  wordDetail: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  verbTag: {
    color: '#16c79a',
    fontSize: 13,
    fontStyle: 'italic',
  },
  detailListenBtn: {
    alignSelf: 'flex-start',
    backgroundColor: '#e94560',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  detailListenText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 13,
  },
  exampleBox: {
    marginTop: 6,
    marginBottom: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: '#0f1729',
    borderRadius: 8,
    alignSelf: 'stretch',
  },
  conjBox: {
    marginBottom: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: '#0f1729',
    borderRadius: 8,
    alignSelf: 'stretch',
    borderLeftWidth: 3,
    borderLeftColor: '#16c79a',
  },
  conjTitle: {
    color: '#16c79a',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  conjInf: {
    color: '#aaa',
    fontSize: 13,
    fontStyle: 'italic',
    marginBottom: 8,
  },
  conjSubtitle: {
    color: '#e94560',
    fontSize: 13,
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 4,
  },
  conjLine: {
    color: '#ffffff',
    fontSize: 15,
    lineHeight: 22,
  },
  conjPron: {
    color: '#888',
    fontSize: 13,
  },
  exampleRu: {
    color: '#ffffff',
    fontSize: 15,
    fontStyle: 'italic',
    marginBottom: 4,
    textAlign: 'center',
  },
  exampleFr: {
    color: '#aaaaaa',
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  cardBtns: {
    flexDirection: 'row',
    gap: 10,
  },
  knownBtn: {
    backgroundColor: '#16c79a',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  knownBtnText: {
    color: '#1a1a2e',
    fontWeight: 'bold',
    fontSize: 14,
  },
  listenBtn: {
    backgroundColor: '#e94560',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  listenBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  tabRow: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#16213e',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  tabActive: {
    backgroundColor: '#e94560',
    borderColor: '#e94560',
  },
  tabText: {
    color: '#888',
    fontWeight: 'bold',
    fontSize: 14,
  },
  tabTextActive: {
    color: '#ffffff',
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 40,
  },
  wordRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#16213e',
    borderRadius: 8,
    marginBottom: 4,
  },
  listItem: {
    fontSize: 16,
    color: '#ffffff',
    flex: 1,
    fontWeight: '500',
  },
  listItemKnown: {
    fontSize: 16,
    color: '#aaaaaa',
    flex: 1,
  },
  checkBtn: {
    color: '#16c79a',
    fontWeight: 'bold',
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(22, 199, 154, 0.15)',
    borderRadius: 6,
    overflow: 'hidden',
  },
  undoBtn: {
    color: '#e94560',
    fontWeight: 'bold',
    fontSize: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: 'rgba(233, 69, 96, 0.15)',
    borderRadius: 8,
    overflow: 'hidden',
  },
  emptyText: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 20,
  },
  quizScoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#16213e',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  quizScoreText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  quizScorePct: {
    color: '#16c79a',
    fontSize: 16,
    fontWeight: 'bold',
  },
  quizCard: {
    backgroundColor: '#16213e',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e94560',
  },
  quizQuestion: {
    fontSize: 14,
    color: '#888',
    marginBottom: 8,
  },
  quizWord: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 12,
    textAlign: 'center',
  },
  iconBtnSmall: {
    backgroundColor: '#e94560',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  iconBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  quizOption: {
    backgroundColor: '#16213e',
    borderRadius: 10,
    padding: 16,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#333',
  },
  quizOptionCorrect: {
    backgroundColor: 'rgba(22, 199, 154, 0.3)',
    borderColor: '#16c79a',
  },
  quizOptionWrong: {
    backgroundColor: 'rgba(233, 69, 96, 0.2)',
    borderColor: '#e94560',
    opacity: 0.6,
  },
  quizOptionText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '500',
    textAlign: 'center',
  },
  quizFeedback: {
    marginTop: 12,
    alignItems: 'center',
  },
  quizFeedbackText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  quizCorrect: {
    color: '#16c79a',
  },
  quizWrong: {
    color: '#e94560',
  },
  quizNextBtn: {
    backgroundColor: '#e94560',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  quizNextBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  addRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  micBtn: {
    backgroundColor: '#16213e',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 10,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 50,
  },
  micBtnActive: {
    backgroundColor: '#e94560',
    borderColor: '#e94560',
  },
  micBtnText: {
    fontSize: 22,
  },
  suggestionsBox: {
    backgroundColor: '#0f1729',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  suggestionsLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 6,
  },
  suggestion: {
    backgroundColor: '#16213e',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: '#333',
  },
  suggestionActive: {
    borderColor: '#16c79a',
    backgroundColor: 'rgba(22, 199, 154, 0.15)',
  },
  suggestionText: {
    color: '#ffffff',
    fontSize: 16,
  },
  addBtn: {
    backgroundColor: '#16c79a',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  addBtnText: {
    color: '#1a1a2e',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
