import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Line, Circle, Rect, Defs, LinearGradient, Stop } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { SliderInput } from '@/components/ui';
import { saveProgress, FreefallData } from '@/lib/database';
import { useAuth } from '@/contexts/AuthContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CANVAS_WIDTH = Math.min(SCREEN_WIDTH - 40, 400);
const CANVAS_HEIGHT = 400;
const TOP_MARGIN = 60;
const GROUND_MARGIN = 60;
const USABLE_HEIGHT = CANVAS_HEIGHT - TOP_MARGIN - GROUND_MARGIN;

interface ActiveRun {
  height: number;
  mass: number;
  gravity: number;
  startedAt: string;
}

export default function FreefallSimulation() {
  const { user } = useAuth();
  
  // Parameters
  const [height, setHeight] = useState(20); // meters
  const [mass, setMass] = useState(1.0); // kg
  const [gravity, setGravity] = useState(9.81); // m/s²
  
  // Simulation state
  const [positionY, setPositionY] = useState(20); // current Y position
  const [velocity, setVelocity] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  
  // Refs for animation
  const animationRef = useRef<number | null>(null);
  const lastTimestampRef = useRef(0);
  const yRef = useRef(height);
  const velocityRef = useRef(0);
  const elapsedRef = useRef(0);
  const activeRunRef = useRef<ActiveRun | null>(null);
  const gravityRef = useRef(gravity);
  const heightRef = useRef(height);

  // Max display height for scaling
  const maxDisplayHeight = 100;
  const pxPerMeter = USABLE_HEIGHT / maxDisplayHeight;

  // Calculate ball position in pixels
  const ballY = CANVAS_HEIGHT - GROUND_MARGIN - (Math.max(0, Math.min(positionY, maxDisplayHeight)) * pxPerMeter);

  // Animation loop
  const animate = useCallback((timestamp: number) => {
    if (!lastTimestampRef.current) {
      lastTimestampRef.current = timestamp;
    }
    
    if (isPaused) {
      animationRef.current = requestAnimationFrame(animate);
      return;
    }
    
    const dt = Math.min(0.05, (timestamp - lastTimestampRef.current) / 1000);
    lastTimestampRef.current = timestamp;
    
    // Physics update
    velocityRef.current -= gravityRef.current * dt;
    yRef.current += velocityRef.current * dt;
    elapsedRef.current += dt;
    
    setPositionY(yRef.current);
    setVelocity(velocityRef.current);
    setElapsed(elapsedRef.current);
    
    // Check if hit ground
    if (yRef.current <= 0) {
      yRef.current = 0;
      setPositionY(0);
      
      // Save progress
      if (activeRunRef.current && user) {
        const run = activeRunRef.current;
        const impactVelocity = Math.sqrt(Math.max(0, 2 * run.gravity * run.height));
        
        saveProgress('freefall', {
          height: run.height,
          mass: run.mass,
          gravity: run.gravity,
          timeOfFlight: elapsedRef.current,
          impactVelocity,
          capturedAt: new Date().toISOString(),
        } as FreefallData);
      }
      
      activeRunRef.current = null;
      setIsRunning(false);
      setIsPaused(false);
      return;
    }
    
    animationRef.current = requestAnimationFrame(animate);
  }, [isPaused, user]);

  // Start/stop animation
  useEffect(() => {
    if (isRunning && !isPaused) {
      lastTimestampRef.current = 0;
      animationRef.current = requestAnimationFrame(animate);
    }
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isRunning, isPaused, animate]);

  // Start simulation
  const startSimulation = () => {
    if (isRunning) return;
    
    // Reset state
    yRef.current = height;
    velocityRef.current = 0;
    elapsedRef.current = 0;
    gravityRef.current = gravity;
    heightRef.current = height;
    lastTimestampRef.current = 0;
    
    activeRunRef.current = {
      height,
      mass,
      gravity,
      startedAt: new Date().toISOString(),
    };
    
    setPositionY(height);
    setVelocity(0);
    setElapsed(0);
    setIsRunning(true);
    setIsPaused(false);
  };

  // Toggle pause
  const togglePause = () => {
    if (!isRunning) return;
    setIsPaused(!isPaused);
    if (isPaused) {
      lastTimestampRef.current = 0;
    }
  };

  // Reset simulation
  const resetSimulation = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    
    yRef.current = height;
    velocityRef.current = 0;
    elapsedRef.current = 0;
    activeRunRef.current = null;
    
    setPositionY(height);
    setVelocity(0);
    setElapsed(0);
    setIsRunning(false);
    setIsPaused(false);
  };

  // Update height when slider changes (only when not running)
  useEffect(() => {
    if (!isRunning) {
      yRef.current = height;
      setPositionY(height);
    }
  }, [height, isRunning]);

  // Calculate theoretical values
  const theoreticalTime = Math.sqrt((2 * height) / gravity);
  const theoreticalVelocity = Math.sqrt(2 * gravity * height);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Canvas */}
        <View style={styles.canvasContainer}>
          <Svg width={CANVAS_WIDTH} height={CANVAS_HEIGHT}>
            <Defs>
              <LinearGradient id="skyGradient" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor="#1a1a2e" />
                <Stop offset="100%" stopColor="#16213e" />
              </LinearGradient>
              <LinearGradient id="groundGradient" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor="#4a7c4a" />
                <Stop offset="100%" stopColor="#2d5a2d" />
              </LinearGradient>
            </Defs>
            
            {/* Sky background */}
            <Rect
              x={0}
              y={0}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT - GROUND_MARGIN}
              fill="url(#skyGradient)"
            />
            
            {/* Ground */}
            <Rect
              x={0}
              y={CANVAS_HEIGHT - GROUND_MARGIN}
              width={CANVAS_WIDTH}
              height={GROUND_MARGIN}
              fill="url(#groundGradient)"
            />
            
            {/* Reference line (dashed) */}
            <Line
              x1={CANVAS_WIDTH / 2}
              y1={CANVAS_HEIGHT - GROUND_MARGIN}
              x2={CANVAS_WIDTH / 2}
              y2={TOP_MARGIN}
              stroke="#9ec5fe"
              strokeWidth={2}
              strokeDasharray="6,6"
            />
            
            {/* Height markers */}
            {[0, 25, 50, 75, 100].map((h) => (
              <View key={h}>
                <Line
                  x1={CANVAS_WIDTH / 2 - 15}
                  y1={CANVAS_HEIGHT - GROUND_MARGIN - (h * pxPerMeter)}
                  x2={CANVAS_WIDTH / 2 + 15}
                  y2={CANVAS_HEIGHT - GROUND_MARGIN - (h * pxPerMeter)}
                  stroke="#666"
                  strokeWidth={1}
                />
              </View>
            ))}
            
            {/* Ball */}
            <Circle
              cx={CANVAS_WIDTH / 2}
              cy={ballY}
              r={15}
              fill="#0a58ca"
            />
          </Svg>
          
          {/* Info overlay */}
          <View style={styles.infoOverlay}>
            <Text style={styles.infoText}>h = {positionY.toFixed(2)} m</Text>
            <Text style={styles.infoText}>v = {Math.abs(velocity).toFixed(2)} m/s</Text>
            <Text style={styles.infoText}>t = {elapsed.toFixed(2)} s</Text>
          </View>
        </View>

        {/* Controls */}
        <View style={styles.controlsCard}>
          <Text style={styles.sectionTitle}>Parameter</Text>
          
          <SliderInput
            label="Ketinggian Awal (h)"
            value={height}
            onValueChange={(val) => {
              setHeight(val);
              if (!isRunning) {
                yRef.current = val;
                setPositionY(val);
              }
            }}
            minimumValue={5}
            maximumValue={100}
            step={1}
            unit="m"
          />
          
          <SliderInput
            label="Massa Benda (m)"
            value={mass}
            onValueChange={setMass}
            minimumValue={0.5}
            maximumValue={10}
            step={0.5}
            unit="kg"
          />
          <Text style={styles.hintText}>
            * Massa tidak mempengaruhi waktu jatuh (di vakum)
          </Text>
          
          <SliderInput
            label="Gravitasi (g)"
            value={gravity}
            onValueChange={(val) => {
              setGravity(val);
              gravityRef.current = val;
            }}
            minimumValue={1}
            maximumValue={20}
            step={0.01}
            unit="m/s²"
          />
        </View>

        {/* Buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[
              styles.button,
              styles.primaryButton,
              isRunning && styles.disabledButton,
            ]}
            onPress={startSimulation}
            disabled={isRunning}
          >
            <Ionicons name="play" size={20} color="#ffffff" />
            <Text style={styles.primaryButtonText}>Mulai</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.button,
              styles.secondaryButton,
              !isRunning && styles.disabledButton,
            ]}
            onPress={togglePause}
            disabled={!isRunning}
          >
            <Ionicons name={isPaused ? 'play' : 'pause'} size={20} color="#1b2a4e" />
            <Text style={styles.secondaryButtonText}>
              {isPaused ? 'Lanjut' : 'Pause'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={resetSimulation}
          >
            <Ionicons name="refresh" size={20} color="#1b2a4e" />
            <Text style={styles.secondaryButtonText}>Reset</Text>
          </TouchableOpacity>
        </View>

        {/* Theoretical Values */}
        <View style={styles.resultsCard}>
          <Text style={styles.sectionTitle}>Nilai Teoritis</Text>
          
          <View style={styles.resultRow}>
            <Text style={styles.resultLabel}>Waktu Jatuh:</Text>
            <Text style={styles.resultValue}>{theoreticalTime.toFixed(3)} s</Text>
          </View>
          
          <View style={styles.resultRow}>
            <Text style={styles.resultLabel}>Kecepatan Akhir:</Text>
            <Text style={styles.resultValue}>{theoreticalVelocity.toFixed(2)} m/s</Text>
          </View>
          
          <View style={styles.resultRow}>
            <Text style={styles.resultLabel}>Energi Potensial:</Text>
            <Text style={styles.resultValue}>
              {(mass * gravity * height).toFixed(2)} J
            </Text>
          </View>
          
          <View style={styles.resultRow}>
            <Text style={styles.resultLabel}>Energi Kinetik (akhir):</Text>
            <Text style={styles.resultValue}>
              {(0.5 * mass * theoreticalVelocity * theoreticalVelocity).toFixed(2)} J
            </Text>
          </View>
        </View>

        {/* Theory Card */}
        <View style={styles.theoryCard}>
          <Text style={styles.sectionTitle}>Rumus Gerak Jatuh Bebas</Text>
          <View style={styles.formulaContainer}>
            <Text style={styles.formulaText}>v = √(2gh)</Text>
            <Text style={styles.formulaText}>t = √(2h/g)</Text>
            <Text style={styles.formulaText}>h = ½gt²</Text>
          </View>
          <Text style={styles.theoryText}>
            Gerak jatuh bebas adalah gerak benda yang dijatuhkan dari ketinggian 
            tertentu tanpa kecepatan awal. Percepatan benda sama dengan percepatan 
            gravitasi (g). Dalam kondisi vakum, semua benda jatuh dengan percepatan 
            yang sama, tidak bergantung pada massanya.
          </Text>
        </View>
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
    overflow: 'hidden',
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
    padding: 10,
    borderRadius: 8,
  },
  infoText: {
    color: '#fff',
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginBottom: 2,
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
    marginBottom: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    gap: 6,
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
    opacity: 0.5,
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
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#dbe6ff',
  },
  resultLabel: {
    color: '#3e4a6b',
    fontSize: 14,
  },
  resultValue: {
    color: '#0a58ca',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
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
  formulaContainer: {
    backgroundColor: 'rgba(10, 88, 202, 0.08)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  formulaText: {
    color: '#0a58ca',
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginVertical: 4,
  },
  theoryText: {
    color: '#3e4a6b',
    fontSize: 14,
    lineHeight: 22,
  },
});
