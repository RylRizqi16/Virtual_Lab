import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Line, Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { SliderInput, QuizCard } from '@/components/ui';
import { saveProgress, PendulumData } from '@/lib/database';
import { useAuth } from '@/contexts/AuthContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CANVAS_WIDTH = Math.min(SCREEN_WIDTH - 40, 400);
const CANVAS_HEIGHT = 350;
const CENTER_X = CANVAS_WIDTH / 2;
const CENTER_Y = 80;
const G_CONST = 9.81;
const TARGET_OSCILLATIONS = 10;

interface ExperimentResult {
  L: number;
  T10: number;
  T: number;
  g: number;
}

export default function PendulumSimulation() {
  const { user } = useAuth();
  
  // Parameters
  const [length, setLength] = useState(1.0); // L in meters
  const [angle, setAngle] = useState(15); // Initial angle in degrees
  const [mass, setMass] = useState(1.0); // Mass in kg (doesn't affect period)
  
  // Simulation state
  const [currentTheta, setCurrentTheta] = useState(15); // Current angle
  const [omega, setOmega] = useState(0); // Angular velocity
  const [isRunning, setIsRunning] = useState(false);
  const [isExperimenting, setIsExperimenting] = useState(false);
  const [oscillationCount, setOscillationCount] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  
  // Results
  const [results, setResults] = useState<ExperimentResult[]>([]);
  const [averageG, setAverageG] = useState<number | null>(null);
  
  // Refs for animation
  const animationRef = useRef<number | null>(null);
  const lastAngleSignRef = useRef(0);
  const startTimeRef = useRef(0);
  const thetaRef = useRef(angle);
  const omegaRef = useRef(0);
  const oscillationCountRef = useRef(0);

  // Degree to Radian conversion
  const degToRad = (deg: number) => deg * (Math.PI / 180);
  const radToDeg = (rad: number) => rad * (180 / Math.PI);

  // Calculate bob position
  const pendulumLengthPx = length * 150; // Scale factor for display
  const thetaRad = degToRad(currentTheta);
  const bobX = CENTER_X + pendulumLengthPx * Math.sin(thetaRad);
  const bobY = CENTER_Y + pendulumLengthPx * Math.cos(thetaRad);
  const bobRadius = 25;

  // Animation loop
  const animate = useCallback(() => {
    const dt = 0.02; // Time step
    
    // Physics update
    const alpha = (-G_CONST / length) * Math.sin(degToRad(thetaRef.current));
    omegaRef.current += alpha * dt;
    thetaRef.current += omegaRef.current * dt * (180 / Math.PI);
    omegaRef.current *= 0.9995; // Damping
    
    setCurrentTheta(thetaRef.current);
    setOmega(omegaRef.current);
    
    // Check oscillation counting
    if (isExperimenting) {
      const currentSign = Math.sign(degToRad(thetaRef.current));
      if (currentSign !== 0 && currentSign !== lastAngleSignRef.current) {
        oscillationCountRef.current += 0.5;
        setOscillationCount(oscillationCountRef.current);
        
        if (oscillationCountRef.current >= TARGET_OSCILLATIONS) {
          endExperiment();
          return;
        }
        lastAngleSignRef.current = currentSign;
      }
      
      const now = Date.now();
      setElapsedTime((now - startTimeRef.current) / 1000);
    }
    
    if (isRunning) {
      animationRef.current = requestAnimationFrame(animate);
    }
  }, [length, isRunning, isExperimenting]);

  // Start animation when running
  useEffect(() => {
    if (isRunning) {
      animationRef.current = requestAnimationFrame(animate);
    }
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isRunning, animate]);

  // Start experiment
  const startExperiment = () => {
    if (isExperimenting) return;
    
    // Reset values
    thetaRef.current = angle;
    omegaRef.current = 0;
    oscillationCountRef.current = 0;
    lastAngleSignRef.current = Math.sign(degToRad(angle));
    startTimeRef.current = Date.now();
    
    setCurrentTheta(angle);
    setOmega(0);
    setOscillationCount(0);
    setElapsedTime(0);
    setIsExperimenting(true);
    setIsRunning(true);
  };

  // End experiment
  const endExperiment = async () => {
    const endTime = Date.now();
    const totalTimeSeconds = (endTime - startTimeRef.current) / 1000;
    const periodT = totalTimeSeconds / TARGET_OSCILLATIONS;
    const calculatedG = (4 * Math.PI * Math.PI * length) / (periodT * periodT);
    
    const newResult: ExperimentResult = {
      L: length,
      T10: totalTimeSeconds,
      T: periodT,
      g: calculatedG,
    };
    
    const updatedResults = [...results, newResult];
    setResults(updatedResults);
    
    // Calculate average g
    const avgG = updatedResults.reduce((sum, r) => sum + r.g, 0) / updatedResults.length;
    setAverageG(avgG);
    
    // Save to database if user is logged in
    if (user) {
      const result = await saveProgress('pendulum', {
        L: length,
        T10: totalTimeSeconds,
        T: periodT,
        g: calculatedG,
        capturedAt: new Date().toISOString(),
      } as PendulumData);
      
      if (result.success) {
        Alert.alert('Eksperimen Selesai', 'Progres berhasil disimpan!');
      }
    }
    
    setIsExperimenting(false);
  };

  // Reset simulation
  const resetSimulation = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    
    thetaRef.current = angle;
    omegaRef.current = 0;
    oscillationCountRef.current = 0;
    
    setCurrentTheta(angle);
    setOmega(0);
    setOscillationCount(0);
    setElapsedTime(0);
    setIsRunning(false);
    setIsExperimenting(false);
  };

  // Clear data
  const clearData = () => {
    setResults([]);
    setAverageG(null);
  };

  // Update angle when slider changes
  useEffect(() => {
    if (!isExperimenting && !isRunning) {
      thetaRef.current = angle;
      setCurrentTheta(angle);
    }
  }, [angle, isExperimenting, isRunning]);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Canvas */}
        <View style={styles.canvasContainer}>
          <Svg width={CANVAS_WIDTH} height={CANVAS_HEIGHT}>
            <Defs>
              <RadialGradient id="bobGradient" cx="40%" cy="40%">
                <Stop offset="0%" stopColor="#0dcaf0" />
                <Stop offset="100%" stopColor="#0a58ca" />
              </RadialGradient>
            </Defs>
            
            {/* Pivot point */}
            <Circle cx={CENTER_X} cy={CENTER_Y} r={6} fill="#002b5c" />
            
            {/* String */}
            <Line
              x1={CENTER_X}
              y1={CENTER_Y}
              x2={bobX}
              y2={bobY}
              stroke="#6c757d"
              strokeWidth={2}
            />
            
            {/* Bob */}
            <Circle
              cx={bobX}
              cy={bobY}
              r={bobRadius}
              fill="url(#bobGradient)"
              stroke="#1b2a4e"
              strokeWidth={1}
            />
          </Svg>
          
          {/* Info overlay */}
          <View style={styles.infoOverlay}>
            <Text style={styles.infoText}>L = {length.toFixed(2)} m</Text>
            <Text style={styles.infoText}>
              t = {isExperimenting ? elapsedTime.toFixed(2) : '0.00'} s
            </Text>
            <Text style={styles.infoText}>
              Osilasi: {oscillationCount.toFixed(1)} / {TARGET_OSCILLATIONS}
            </Text>
          </View>
        </View>

        {/* Controls */}
        <View style={styles.controlsCard}>
          <Text style={styles.sectionTitle}>Parameter</Text>
          
          <SliderInput
            label="Panjang Tali (L)"
            value={length}
            onValueChange={(val) => {
              setLength(val);
              if (!isExperimenting) resetSimulation();
            }}
            minimumValue={0.5}
            maximumValue={2.5}
            step={0.1}
            unit="m"
            disabled={isExperimenting}
          />
          
          <SliderInput
            label="Sudut Awal"
            value={angle}
            onValueChange={(val) => {
              setAngle(val);
              if (!isExperimenting) {
                thetaRef.current = val;
                setCurrentTheta(val);
              }
            }}
            minimumValue={5}
            maximumValue={45}
            step={1}
            unit="°"
            disabled={isExperimenting}
          />
          
          <SliderInput
            label="Massa Beban"
            value={mass}
            onValueChange={setMass}
            minimumValue={0.5}
            maximumValue={5.0}
            step={0.1}
            unit="kg"
            disabled={isExperimenting}
          />
          <Text style={styles.hintText}>
            * Massa tidak mempengaruhi periode bandul sederhana
          </Text>
        </View>

        {/* Buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[
              styles.button,
              styles.primaryButton,
              isExperimenting && styles.disabledButton,
            ]}
            onPress={startExperiment}
            disabled={isExperimenting}
          >
            <Ionicons 
              name={isExperimenting ? 'hourglass' : 'play'} 
              size={20} 
              color="#ffffff" 
            />
            <Text style={styles.primaryButtonText}>
              {isExperimenting ? 'Mengukur...' : `Mulai (${TARGET_OSCILLATIONS} osilasi)`}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={resetSimulation}
            disabled={isExperimenting}
          >
            <Ionicons name="refresh" size={20} color="#1b2a4e" />
            <Text style={styles.secondaryButtonText}>Reset</Text>
          </TouchableOpacity>
        </View>

        {/* Results */}
        <View style={styles.resultsCard}>
          <View style={styles.resultsHeader}>
            <Text style={styles.sectionTitle}>Hasil Eksperimen</Text>
            {results.length > 0 && (
              <TouchableOpacity onPress={clearData}>
                <Text style={styles.clearButton}>Hapus Data</Text>
              </TouchableOpacity>
            )}
          </View>
          
          {results.length === 0 ? (
            <Text style={styles.emptyText}>
              Belum ada data. Jalankan eksperimen untuk merekam hasil.
            </Text>
          ) : (
            <>
              {/* Table Header */}
              <View style={styles.tableHeader}>
                <Text style={[styles.tableCell, styles.cellNo]}>#</Text>
                <Text style={[styles.tableCell, styles.cellL]}>L (m)</Text>
                <Text style={[styles.tableCell, styles.cellT10]}>T₁₀ (s)</Text>
                <Text style={[styles.tableCell, styles.cellT]}>T (s)</Text>
                <Text style={[styles.tableCell, styles.cellG]}>g (m/s²)</Text>
              </View>
              
              {/* Table Rows */}
              {results.map((result, index) => (
                <View key={index} style={styles.tableRow}>
                  <Text style={[styles.tableCell, styles.cellNo]}>{index + 1}</Text>
                  <Text style={[styles.tableCell, styles.cellL]}>{result.L.toFixed(2)}</Text>
                  <Text style={[styles.tableCell, styles.cellT10]}>{result.T10.toFixed(2)}</Text>
                  <Text style={[styles.tableCell, styles.cellT]}>{result.T.toFixed(3)}</Text>
                  <Text style={[styles.tableCell, styles.cellG]}>{result.g.toFixed(3)}</Text>
                </View>
              ))}
              
              {/* Average */}
              {averageG !== null && (
                <View style={styles.averageRow}>
                  <Text style={styles.averageLabel}>Rata-rata g:</Text>
                  <Text style={styles.averageValue}>{averageG.toFixed(4)} m/s²</Text>
                </View>
              )}
            </>
          )}
        </View>

        {/* Theory Card */}
        <View style={styles.theoryCard}>
          <Text style={styles.sectionTitle}>Rumus Bandul Sederhana</Text>
          <Text style={styles.formulaText}>T = 2π√(L/g)</Text>
          <Text style={styles.theoryText}>
            Periode bandul sederhana hanya bergantung pada panjang tali (L) dan 
            percepatan gravitasi (g), tidak bergantung pada massa beban atau 
            amplitudo (untuk sudut kecil).
          </Text>
        </View>

        {/* Quiz Card */}
        <QuizCard experiment="pendulum" title="Kuis Bandul" />
      </ScrollView>
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
  canvasContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 10,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#dbe6ff',
    shadowColor: '#0a58ca',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  infoOverlay: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(27, 42, 78, 0.9)',
    padding: 8,
    borderRadius: 8,
  },
  infoText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  controlsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#dbe6ff',
    shadowColor: '#0a58ca',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1b2a4e',
    marginBottom: 16,
  },
  hintText: {
    fontSize: 12,
    color: '#3e4a6b',
    fontStyle: 'italic',
    marginTop: -8,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    gap: 8,
  },
  primaryButton: {
    backgroundColor: '#0a58ca',
  },
  secondaryButton: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dbe6ff',
  },
  disabledButton: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: '#1b2a4e',
    fontSize: 14,
    fontWeight: '600',
  },
  resultsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#dbe6ff',
    shadowColor: '#0a58ca',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  clearButton: {
    color: '#e74c3c',
    fontSize: 14,
  },
  emptyText: {
    color: '#3e4a6b',
    fontSize: 14,
    textAlign: 'center',
    padding: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#dbe6ff',
    paddingBottom: 8,
    marginBottom: 8,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#dbe6ff',
  },
  tableCell: {
    color: '#1b2a4e',
    fontSize: 12,
  },
  cellNo: { width: 25 },
  cellL: { flex: 1, textAlign: 'center' },
  cellT10: { flex: 1, textAlign: 'center' },
  cellT: { flex: 1, textAlign: 'center' },
  cellG: { flex: 1.2, textAlign: 'right' },
  averageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 2,
    borderTopColor: '#0a58ca',
  },
  averageLabel: {
    color: '#3e4a6b',
    fontSize: 14,
    fontWeight: '600',
  },
  averageValue: {
    color: '#0a58ca',
    fontSize: 18,
    fontWeight: 'bold',
  },
  theoryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#dbe6ff',
    shadowColor: '#0a58ca',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  formulaText: {
    color: '#0a58ca',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  theoryText: {
    color: '#3e4a6b',
    fontSize: 14,
    lineHeight: 22,
  },
});
