import { useEffect, useState, useCallback, useRef, Platform } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity, TextInput, AppState } from 'react-native';

// Text-to-speech
let Speech = null;
if (Platform.OS !== 'web') {
  Speech = require('expo-speech');
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
];

const VERSION = '1.5.0';
const PRESETS = [5, 10, 15, 30, 60, 120];
const STORAGE_KEY = 'sendy_known_words';
const STORAGE_ENABLED = 'sendy_enabled';
const STORAGE_INTERVAL = 'sendy_interval';
const STORAGE_VOICE = 'sendy_voice';

export default function App() {
  const [enabled, setEnabled] = useState(false);
  const [interval, setIntervalVal] = useState(30);
  const [customInterval, setCustomInterval] = useState('');
  const [status, setStatus] = useState('Desactive');
  const [nextWord, setNextWord] = useState(null);
  const [knownWords, setKnownWords] = useState([]);
  const [showKnown, setShowKnown] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const webTimerRef = useRef(null);

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
  }, []);

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

  const activeWords = WORDS.filter((w) => !knownWords.includes(w.ru));

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
      await Notifications.scheduleNotificationAsync({
        content: {
          title: word.ru,
          body: word.fr,
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
    if ('Notification' in window && window.Notification.permission === 'granted') {
      new window.Notification(word.ru, { body: word.fr });
    }
    setNextWord(word);
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
      if (first) setNextWord(first);
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

    const sub1 = Notifications.addNotificationReceivedListener((notification) => {
      const { title, body } = notification.request.content;
      const w = { ru: title, fr: body };
      setNextWord(w);
      speakWord(w);
    });

    const sub2 = Notifications.addNotificationResponseReceivedListener((response) => {
      const { title, body } = response.notification.request.content;
      const w = { ru: title, fr: body };
      setNextWord(w);
      speakWord(w);
    });

    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) {
        const { title, body } = response.notification.request.content;
        const w = { ru: title, fr: body };
        setNextWord(w);
        speakWord(w);
      }
    });

    return () => {
      sub1.remove();
      sub2.remove();
    };
  }, [speakWord]);

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
      <Text style={styles.title}>Sendy <Text style={styles.version}>v{VERSION}</Text></Text>
      <Text style={styles.subtitle}>Apprends le russe</Text>

      {/* ON / OFF */}
      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Notifications</Text>
        <Switch
          value={enabled}
          onValueChange={setEnabled}
          trackColor={{ false: '#555', true: '#e94560' }}
          thumbColor={enabled ? '#fff' : '#ccc'}
        />
      </View>

      {/* Voix ON / OFF */}
      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Voix</Text>
        <Switch
          value={voiceEnabled}
          onValueChange={setVoiceEnabled}
          trackColor={{ false: '#555', true: '#16c79a' }}
          thumbColor={voiceEnabled ? '#fff' : '#ccc'}
        />
      </View>

      {/* Frequence */}
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

      {/* Carte du mot */}
      {nextWord && (
        <View style={styles.card}>
          <Text style={styles.russian}>{nextWord.ru}</Text>
          <Text style={styles.french}>{nextWord.fr}</Text>
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
            <View key={index} style={styles.wordRow}>
              <Text style={styles.listItem}>
                {word.ru} — {word.fr}
              </Text>
              <TouchableOpacity onPress={() => markAsKnown(word.ru)}>
                <Text style={styles.checkBtn}>OK</Text>
              </TouchableOpacity>
            </View>
          ))
        ) : (
          knownWords.length === 0 ? (
            <Text style={styles.emptyText}>Aucun mot connu pour l'instant</Text>
          ) : (
            WORDS.filter((w) => knownWords.includes(w.ru)).map((word, index) => (
              <View key={index} style={styles.wordRow}>
                <Text style={styles.listItemKnown}>
                  {word.ru} — {word.fr}
                </Text>
                <TouchableOpacity onPress={() => markAsUnknown(word.ru)}>
                  <Text style={styles.undoBtn}>Remettre</Text>
                </TouchableOpacity>
              </View>
            ))
          )
        )}
      </ScrollView>
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
    paddingTop: 60,
    paddingHorizontal: 20,
    maxWidth: 600,
    width: '100%',
  },
  title: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#e94560',
    textAlign: 'center',
  },
  version: {
    fontSize: 16,
    fontWeight: 'normal',
    color: '#888',
  },
  subtitle: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    marginBottom: 20,
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
});
