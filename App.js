import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity, TextInput } from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

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
];

const PRESETS = [5, 10, 15, 30, 60, 120];
const STORAGE_KEY = 'sendy_known_words';

export default function App() {
  const [enabled, setEnabled] = useState(false);
  const [interval, setInterval] = useState(30);
  const [customInterval, setCustomInterval] = useState('');
  const [status, setStatus] = useState('Desactive');
  const [nextWord, setNextWord] = useState(null);
  const [knownWords, setKnownWords] = useState([]);
  const [showKnown, setShowKnown] = useState(false);

  // Charger les mots connus au lancement
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((data) => {
      if (data) setKnownWords(JSON.parse(data));
    });
  }, []);

  // Sauvegarder quand la liste change
  useEffect(() => {
    if (knownWords.length > 0) {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(knownWords));
    }
  }, [knownWords]);

  // Mots actifs = tous les mots sauf ceux qu'on connait
  const activeWords = WORDS.filter((w) => !knownWords.includes(w.ru));

  const markAsKnown = (ruWord) => {
    if (!knownWords.includes(ruWord)) {
      setKnownWords([...knownWords, ruWord]);
    }
  };

  const markAsUnknown = (ruWord) => {
    setKnownWords(knownWords.filter((w) => w !== ruWord));
  };

  const scheduleNotifications = useCallback(async (minutes, words) => {
    await Notifications.cancelAllScheduledNotificationsAsync();

    if (words.length === 0) {
      setStatus('Tous les mots sont connus !');
      return;
    }

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

    const first = words[Math.floor(Math.random() * words.length)];
    setNextWord(first);
    setStatus(`${maxNotifs} notifications / ${minutes} min (${words.length} mots actifs)`);
  }, []);

  const stopNotifications = useCallback(async () => {
    await Notifications.cancelAllScheduledNotificationsAsync();
    setStatus('Desactive');
  }, []);

  useEffect(() => {
    Notifications.requestPermissionsAsync();
  }, []);

  // Replanifier quand on change ON/OFF, intervalle, ou mots actifs
  useEffect(() => {
    if (enabled) {
      scheduleNotifications(interval, activeWords);
    } else {
      stopNotifications();
    }
  }, [enabled, interval, knownWords.length]);

  // Quand une notif arrive et l'app est ouverte
  useEffect(() => {
    const subscription = Notifications.addNotificationReceivedListener((notification) => {
      const { title, body } = notification.request.content;
      setNextWord({ ru: title, fr: body });
    });
    return () => subscription.remove();
  }, []);

  // Quand on clique sur la notification pour ouvrir l'app
  useEffect(() => {
    // Verifier si l'app a ete ouverte via une notification
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) {
        const { title, body } = response.notification.request.content;
        setNextWord({ ru: title, fr: body });
      }
    });

    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const { title, body } = response.notification.request.content;
      setNextWord({ ru: title, fr: body });
    });
    return () => subscription.remove();
  }, []);

  const selectInterval = (minutes) => {
    setInterval(minutes);
    setCustomInterval('');
  };

  const applyCustomInterval = () => {
    const val = parseInt(customInterval, 10);
    if (val > 0) {
      setInterval(val);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sendy</Text>
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

      {/* Carte du mot avec bouton "Je connais" */}
      {nextWord && (
        <View style={styles.card}>
          <Text style={styles.russian}>{nextWord.ru}</Text>
          <Text style={styles.french}>{nextWord.fr}</Text>
          {!knownWords.includes(nextWord.ru) && (
            <TouchableOpacity
              style={styles.knownBtn}
              onPress={() => markAsKnown(nextWord.ru)}
            >
              <Text style={styles.knownBtnText}>Je connais ce mot</Text>
            </TouchableOpacity>
          )}
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
      <ScrollView style={styles.list}>
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#e94560',
    textAlign: 'center',
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
    marginBottom: 16,
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
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#16213e',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
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
  wordRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  listItem: {
    fontSize: 16,
    color: '#cccccc',
    flex: 1,
  },
  listItemKnown: {
    fontSize: 16,
    color: '#888',
    flex: 1,
  },
  checkBtn: {
    color: '#16c79a',
    fontWeight: 'bold',
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  undoBtn: {
    color: '#e94560',
    fontWeight: 'bold',
    fontSize: 13,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  emptyText: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 20,
  },
});
