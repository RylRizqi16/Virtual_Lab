import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, TextInput, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { getUserStats, UserStats } from '@/lib/database';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  
  // Stats state
  const [stats, setStats] = useState<UserStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  
  // Modal states
  const [editProfileVisible, setEditProfileVisible] = useState(false);
  const [progressVisible, setProgressVisible] = useState(false);
  const [achievementsVisible, setAchievementsVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [helpVisible, setHelpVisible] = useState(false);
  const [aboutVisible, setAboutVisible] = useState(false);
  
  // Edit profile state
  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || '');

  // Fetch stats when screen is focused
  const fetchStats = useCallback(async () => {
    if (!user) {
      setStats(null);
      setIsLoadingStats(false);
      return;
    }
    
    setIsLoadingStats(true);
    try {
      const userStats = await getUserStats();
      setStats(userStats);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setIsLoadingStats(false);
    }
  }, [user]);

  // Refetch stats when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchStats();
    }, [fetchStats])
  );

  const handleSignOut = async () => {
    Alert.alert(
      'Keluar',
      'Apakah Anda yakin ingin keluar?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Keluar',
          style: 'destructive',
          onPress: async () => {
            await signOut();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  const handleSaveProfile = () => {
    Alert.alert('Berhasil', 'Profil berhasil diperbarui!');
    setEditProfileVisible(false);
  };

  const menuItems = [
    { icon: 'person-outline', title: 'Edit Profil', onPress: () => setEditProfileVisible(true) },
    { icon: 'bar-chart-outline', title: 'Progres Saya', onPress: () => setProgressVisible(true) },
    { icon: 'trophy-outline', title: 'Pencapaian', onPress: () => setAchievementsVisible(true) },
    { icon: 'settings-outline', title: 'Pengaturan', onPress: () => setSettingsVisible(true) },
    { icon: 'help-circle-outline', title: 'Bantuan', onPress: () => setHelpVisible(true) },
    { icon: 'information-circle-outline', title: 'Tentang', onPress: () => setAboutVisible(true) },
  ];

  // Progress data from stats
  const progressData = stats?.experimentProgress || [
    { name: 'Jatuh Bebas', completed: 0, total: 5 },
    { name: 'Bandul', completed: 0, total: 5 },
    { name: 'Gerak Parabola', completed: 0, total: 5 },
  ];

  // Achievements data (computed from stats)
  const achievements = [
    { 
      icon: 'rocket', 
      title: 'Pemula', 
      description: 'Selesaikan simulasi pertama', 
      unlocked: (stats?.totalExperiments || 0) >= 1 
    },
    { 
      icon: 'flask', 
      title: 'Eksperimenter', 
      description: 'Selesaikan 5 eksperimen', 
      unlocked: (stats?.totalExperiments || 0) >= 5 
    },
    { 
      icon: 'trophy', 
      title: 'Ahli Fisika', 
      description: 'Selesaikan semua simulasi', 
      unlocked: (stats?.progressPercent || 0) >= 100 
    },
    { 
      icon: 'star', 
      title: 'Bintang', 
      description: 'Jawab 10 kuis dengan benar', 
      unlocked: (stats?.totalQuizCorrect || 0) >= 10 
    },
  ];

  // FAQ data
  const faqItems = [
    { q: 'Bagaimana cara memulai simulasi?', a: 'Pilih simulasi dari menu Simulasi, lalu atur parameter dan tekan tombol Mulai.' },
    { q: 'Apakah data saya tersimpan?', a: 'Ya, semua progres dan hasil eksperimen Anda tersimpan secara otomatis di cloud.' },
    { q: 'Bagaimana cara menghubungi dukungan?', a: 'Kirim email ke support@simulab.id untuk bantuan lebih lanjut.' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <Ionicons name="person" size={50} color="#0a58ca" />
          </View>
          <Text style={styles.userName}>
            {user?.user_metadata?.full_name || 'Pengguna'}
          </Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          {isLoadingStats ? (
            <View style={styles.loadingStats}>
              <ActivityIndicator size="small" color="#0a58ca" />
              <Text style={styles.loadingText}>Memuat...</Text>
            </View>
          ) : (
            <>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats?.totalExperiments || 0}</Text>
                <Text style={styles.statLabel}>Eksperimen</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats?.totalQuizAttempts || 0}</Text>
                <Text style={styles.statLabel}>Kuis</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats?.progressPercent || 0}%</Text>
                <Text style={styles.statLabel}>Progres</Text>
              </View>
            </>
          )}
        </View>

        {/* Menu Items */}
        <View style={styles.menuContainer}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.menuItem}
              onPress={item.onPress}
            >
              <Ionicons name={item.icon as any} size={24} color="#3e4a6b" />
              <Text style={styles.menuItemText}>{item.title}</Text>
              <Ionicons name="chevron-forward" size={20} color="#3e4a6b" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={24} color="#e74c3c" />
          <Text style={styles.signOutText}>Keluar</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal visible={editProfileVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profil</Text>
              <TouchableOpacity onPress={() => setEditProfileVisible(false)}>
                <Ionicons name="close" size={24} color="#3e4a6b" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>Nama Lengkap</Text>
              <TextInput
                style={styles.modalInput}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Masukkan nama lengkap"
                placeholderTextColor="#3e4a6b"
              />
              
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={[styles.modalInput, styles.inputDisabled]}
                value={user?.email || ''}
                editable={false}
              />
              <Text style={styles.hintText}>Email tidak dapat diubah</Text>
            </View>
            
            <TouchableOpacity style={styles.modalButton} onPress={handleSaveProfile}>
              <Text style={styles.modalButtonText}>Simpan Perubahan</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Progress Modal */}
      <Modal visible={progressVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Progres Saya</Text>
              <TouchableOpacity onPress={() => setProgressVisible(false)}>
                <Ionicons name="close" size={24} color="#3e4a6b" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalBody}>
              {progressData.map((item, index) => (
                <View key={index} style={styles.progressItem}>
                  <View style={styles.progressHeader}>
                    <Text style={styles.progressName}>{item.name}</Text>
                    <Text style={styles.progressCount}>{item.completed}/{item.total}</Text>
                  </View>
                  <View style={styles.progressBarBg}>
                    <View 
                      style={[
                        styles.progressBarFill, 
                        { width: `${(item.completed / item.total) * 100}%` }
                      ]} 
                    />
                  </View>
                </View>
              ))}
              
              <View style={styles.totalProgress}>
                <Text style={styles.totalProgressLabel}>Total Progres</Text>
                <Text style={styles.totalProgressValue}>{stats?.progressPercent || 0}%</Text>
              </View>
              
              {/* Quiz Stats */}
              <View style={styles.quizStatsSection}>
                <Text style={styles.quizStatsTitle}>Statistik Kuis</Text>
                <View style={styles.quizStatsRow}>
                  <View style={styles.quizStatItem}>
                    <Text style={styles.quizStatValue}>{stats?.totalQuizAttempts || 0}</Text>
                    <Text style={styles.quizStatLabel}>Total Percobaan</Text>
                  </View>
                  <View style={styles.quizStatItem}>
                    <Text style={[styles.quizStatValue, styles.correctValue]}>{stats?.totalQuizCorrect || 0}</Text>
                    <Text style={styles.quizStatLabel}>Jawaban Benar</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Achievements Modal */}
      <Modal visible={achievementsVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Pencapaian</Text>
              <TouchableOpacity onPress={() => setAchievementsVisible(false)}>
                <Ionicons name="close" size={24} color="#3e4a6b" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody}>
              {achievements.map((item, index) => (
                <View 
                  key={index} 
                  style={[
                    styles.achievementItem,
                    !item.unlocked && styles.achievementLocked
                  ]}
                >
                  <View style={[
                    styles.achievementIcon,
                    item.unlocked ? styles.achievementIconUnlocked : styles.achievementIconLocked
                  ]}>
                    <Ionicons 
                      name={item.icon as any} 
                      size={24} 
                      color={item.unlocked ? '#ffffff' : '#3e4a6b'} 
                    />
                  </View>
                  <View style={styles.achievementInfo}>
                    <Text style={styles.achievementTitle}>{item.title}</Text>
                    <Text style={styles.achievementDesc}>{item.description}</Text>
                  </View>
                  {item.unlocked && (
                    <Ionicons name="checkmark-circle" size={24} color="#1abc9c" />
                  )}
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Settings Modal */}
      <Modal visible={settingsVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Pengaturan</Text>
              <TouchableOpacity onPress={() => setSettingsVisible(false)}>
                <Ionicons name="close" size={24} color="#3e4a6b" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalBody}>
              <TouchableOpacity style={styles.settingItem}>
                <Ionicons name="notifications-outline" size={24} color="#3e4a6b" />
                <Text style={styles.settingText}>Notifikasi</Text>
                <View style={styles.settingToggle}>
                  <View style={styles.toggleOn} />
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.settingItem}>
                <Ionicons name="moon-outline" size={24} color="#3e4a6b" />
                <Text style={styles.settingText}>Mode Gelap</Text>
                <View style={styles.settingToggle}>
                  <View style={styles.toggleOff} />
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.settingItem}>
                <Ionicons name="language-outline" size={24} color="#3e4a6b" />
                <Text style={styles.settingText}>Bahasa</Text>
                <Text style={styles.settingValue}>Indonesia</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.settingItem}
                onPress={() => Alert.alert('Cache Dihapus', 'Cache aplikasi berhasil dihapus.')}
              >
                <Ionicons name="trash-outline" size={24} color="#3e4a6b" />
                <Text style={styles.settingText}>Hapus Cache</Text>
                <Ionicons name="chevron-forward" size={20} color="#3e4a6b" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Help Modal */}
      <Modal visible={helpVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Bantuan</Text>
              <TouchableOpacity onPress={() => setHelpVisible(false)}>
                <Ionicons name="close" size={24} color="#3e4a6b" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody}>
              <Text style={styles.faqTitle}>Pertanyaan Umum (FAQ)</Text>
              {faqItems.map((item, index) => (
                <View key={index} style={styles.faqItem}>
                  <Text style={styles.faqQuestion}>{item.q}</Text>
                  <Text style={styles.faqAnswer}>{item.a}</Text>
                </View>
              ))}
              
              <View style={styles.contactSection}>
                <Text style={styles.contactTitle}>Hubungi Kami</Text>
                <TouchableOpacity style={styles.contactItem}>
                  <Ionicons name="mail-outline" size={20} color="#0a58ca" />
                  <Text style={styles.contactText}>support@simulab.id</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.contactItem}>
                  <Ionicons name="logo-whatsapp" size={20} color="#1abc9c" />
                  <Text style={styles.contactText}>+62 812-3456-7890</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* About Modal */}
      <Modal visible={aboutVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Tentang</Text>
              <TouchableOpacity onPress={() => setAboutVisible(false)}>
                <Ionicons name="close" size={24} color="#3e4a6b" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalBody}>
              <View style={styles.aboutLogo}>
                <Ionicons name="flask" size={60} color="#0a58ca" />
                <Text style={styles.aboutAppName}>SimuLab</Text>
                <Text style={styles.aboutVersion}>Versi 1.0.0</Text>
              </View>
              
              <Text style={styles.aboutDescription}>
                SimuLab adalah aplikasi simulasi fisika interaktif yang dirancang untuk membantu 
                siswa dan mahasiswa memahami konsep-konsep fisika melalui eksperimen virtual.
              </Text>
              
              <View style={styles.aboutInfo}>
                <Text style={styles.aboutInfoItem}>© 2025 SimuLab</Text>
                <Text style={styles.aboutInfoItem}>Dibuat dengan ❤️ di Indonesia</Text>
              </View>
              
              <View style={styles.aboutLinks}>
                <TouchableOpacity style={styles.aboutLink}>
                  <Text style={styles.aboutLinkText}>Kebijakan Privasi</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.aboutLink}>
                  <Text style={styles.aboutLinkText}>Syarat & Ketentuan</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f9ff',
  },
  scrollContent: {
    padding: 20,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 3,
    borderColor: '#dbe6ff',
    shadowColor: '#0a58ca',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1b2a4e',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#3e4a6b',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#dbe6ff',
    shadowColor: '#0a58ca',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0a58ca',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#3e4a6b',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#dbe6ff',
  },
  menuContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#dbe6ff',
    shadowColor: '#0a58ca',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#dbe6ff',
  },
  menuItemText: {
    flex: 1,
    fontSize: 16,
    color: '#1b2a4e',
    marginLeft: 16,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(231, 76, 60, 0.1)',
    borderRadius: 12,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(231, 76, 60, 0.2)',
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e74c3c',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingBottom: 34,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#dbe6ff',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1b2a4e',
  },
  modalBody: {
    padding: 20,
  },
  modalInput: {
    backgroundColor: '#f5f9ff',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1b2a4e',
    borderWidth: 1,
    borderColor: '#dbe6ff',
    marginBottom: 16,
  },
  inputDisabled: {
    opacity: 0.6,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3e4a6b',
    marginBottom: 8,
  },
  hintText: {
    fontSize: 12,
    color: '#3e4a6b',
    marginTop: -12,
    marginBottom: 16,
  },
  modalButton: {
    backgroundColor: '#0a58ca',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Progress styles
  progressItem: {
    marginBottom: 20,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1b2a4e',
  },
  progressCount: {
    fontSize: 14,
    color: '#3e4a6b',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#dbe6ff',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#0a58ca',
    borderRadius: 4,
  },
  totalProgress: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#dbe6ff',
    marginTop: 10,
  },
  totalProgressLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1b2a4e',
  },
  totalProgressValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0a58ca',
  },
  // Achievement styles
  achievementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f5f9ff',
    borderRadius: 12,
    marginBottom: 12,
  },
  achievementLocked: {
    opacity: 0.6,
  },
  achievementIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  achievementIconUnlocked: {
    backgroundColor: '#0a58ca',
  },
  achievementIconLocked: {
    backgroundColor: '#dbe6ff',
  },
  achievementInfo: {
    flex: 1,
  },
  achievementTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1b2a4e',
    marginBottom: 4,
  },
  achievementDesc: {
    fontSize: 13,
    color: '#3e4a6b',
  },
  // Settings styles
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#dbe6ff',
  },
  settingText: {
    flex: 1,
    fontSize: 16,
    color: '#1b2a4e',
    marginLeft: 16,
  },
  settingValue: {
    fontSize: 14,
    color: '#3e4a6b',
  },
  settingToggle: {
    width: 50,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  toggleOn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#0a58ca',
    alignSelf: 'flex-end',
  },
  toggleOff: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#3e4a6b',
    alignSelf: 'flex-start',
  },
  // FAQ/Help styles
  faqTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1b2a4e',
    marginBottom: 16,
  },
  faqItem: {
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#dbe6ff',
  },
  faqQuestion: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1b2a4e',
    marginBottom: 8,
  },
  faqAnswer: {
    fontSize: 14,
    color: '#3e4a6b',
    lineHeight: 20,
  },
  contactSection: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#dbe6ff',
  },
  contactTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1b2a4e',
    marginBottom: 16,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  contactText: {
    fontSize: 14,
    color: '#0a58ca',
  },
  // About styles
  aboutLogo: {
    alignItems: 'center',
    marginBottom: 24,
  },
  aboutAppName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0a58ca',
    marginTop: 12,
  },
  aboutVersion: {
    fontSize: 14,
    color: '#3e4a6b',
    marginTop: 4,
  },
  aboutDescription: {
    fontSize: 14,
    color: '#3e4a6b',
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
  },
  aboutInfo: {
    alignItems: 'center',
    marginBottom: 24,
  },
  aboutInfoItem: {
    fontSize: 13,
    color: '#3e4a6b',
    marginBottom: 4,
  },
  aboutLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
  },
  aboutLink: {
    padding: 8,
  },
  aboutLinkText: {
    fontSize: 14,
    color: '#0a58ca',
    textDecorationLine: 'underline',
  },
  // Loading styles
  loadingStats: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
  },
  loadingText: {
    fontSize: 14,
    color: '#3e4a6b',
  },
  // Quiz stats styles
  quizStatsSection: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#dbe6ff',
  },
  quizStatsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1b2a4e',
    marginBottom: 16,
  },
  quizStatsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  quizStatItem: {
    flex: 1,
    backgroundColor: '#f5f9ff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  quizStatValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0a58ca',
    marginBottom: 4,
  },
  correctValue: {
    color: '#1abc9c',
  },
  quizStatLabel: {
    fontSize: 12,
    color: '#3e4a6b',
    textAlign: 'center',
  },
});
