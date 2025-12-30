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
import Svg, { 
  Path, 
  Circle, 
  Rect, 
  Line, 
  Defs, 
  LinearGradient, 
  Stop,
  G,
  Text as SvgText 
} from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { SliderInput, QuizCard } from '@/components/ui';
import { saveProgress, ProjectileData } from '@/lib/database';
import { useAuth } from '@/contexts/AuthContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CANVAS_WIDTH = Math.min(SCREEN_WIDTH - 40, 400);
const CANVAS_HEIGHT = 300;
const MARGIN_LEFT = 30;
const MARGIN_BOTTOM = 30;
const USABLE_WIDTH = CANVAS_WIDTH - MARGIN_LEFT - 20;
const USABLE_HEIGHT = CANVAS_HEIGHT - MARGIN_BOTTOM - 20;

interface TrailPoint {
  x: number;
  y: number;
}

interface ActiveRun {
  speed: number;
  angle: number;
  gravity: number;
  expectedRange: number;
  expectedHmax: number;
  startedAt: string;
}

export default function ProjectileSimulation() {
  const { user } = useAuth();
  
  // Parameters
  const [speed, setSpeed] = useState(40); // m/s
  const [angle, setAngle] = useState(45); // degrees
  const [gravity, setGravity] = useState(9.81); // m/s²
  
  // Simulation state
  const [currentX, setCurrentX] = useState(0);
  const [currentY, setCurrentY] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [trail, setTrail] = useState<TrailPoint[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  
  // Refs for animation
  const animationRef = useRef<number | null>(null);
  const lastTimestampRef = useRef(0);
  const elapsedRef = useRef(0);
  const trailRef = useRef<TrailPoint[]>([]);
  const activeRunRef = useRef<ActiveRun | null>(null);

  // Degree to Radian conversion
  const degToRad = (deg: number) => deg * (Math.PI / 180);

  // Calculate derived values
  const calculateDerivedValues = useCallback(() => {
    const angleRad = degToRad(angle);
    const vx = speed * Math.cos(angleRad);
    const vy = speed * Math.sin(angleRad);
    const tFlight = (2 * vy) / gravity;
    const expectedRange = vx * tFlight;
    const expectedHmax = (vy * vy) / (2 * gravity);
    return { angleRad, vx, vy, tFlight, expectedRange, expectedHmax };
  }, [speed, angle, gravity]);

  const derived = calculateDerivedValues();

  // Calculate scale for display
  const getScale = useCallback(() => {
    let maxX = Math.max(derived.expectedRange, 10);
    let maxY = Math.max(derived.expectedHmax, 5);
    
    // Consider trail points
    trailRef.current.forEach(point => {
      if (point.x > maxX) maxX = point.x;
      if (point.y > maxY) maxY = point.y;
    });
    
    const scaleX = USABLE_WIDTH / (maxX * 1.1);
    const scaleY = USABLE_HEIGHT / (maxY * 1.2);
    
    return { scaleX, scaleY, maxX: maxX * 1.1, maxY: maxY * 1.2 };
  }, [derived]);

  // Generate trail path
  const generateTrailPath = useCallback(() => {
    if (trailRef.current.length < 2) return '';
    
    const scale = getScale();
    
    const points = trailRef.current.map(point => ({
      px: MARGIN_LEFT + point.x * scale.scaleX,
      py: CANVAS_HEIGHT - MARGIN_BOTTOM - point.y * scale.scaleY,
    }));
    
    let path = `M ${points[0].px} ${points[0].py}`;
    for (let i = 1; i < points.length; i++) {
      path += ` L ${points[i].px} ${points[i].py}`;
    }
    
    return path;
  }, [getScale]);

  // Animation loop
  const animate = useCallback(async (timestamp: number) => {
    if (!lastTimestampRef.current) {
      lastTimestampRef.current = timestamp;
    }
    
    let dt = (timestamp - lastTimestampRef.current) / 1000;
    dt = Math.min(0.05, Math.max(dt, 0.016));
    lastTimestampRef.current = timestamp;
    
    elapsedRef.current += dt;
    
    const { vx, vy } = calculateDerivedValues();
    const x = vx * elapsedRef.current;
    const y = vy * elapsedRef.current - 0.5 * gravity * elapsedRef.current * elapsedRef.current;
    
    // Check if hit ground
    if (y <= 0 && elapsedRef.current > 0) {
      const landingX = x;
      trailRef.current.push({ x: landingX, y: 0 });
      setTrail([...trailRef.current]);
      setCurrentX(landingX);
      setCurrentY(0);
      setElapsed(elapsedRef.current);
      
      // Save progress
      if (activeRunRef.current && user) {
        const run = activeRunRef.current;
        const result = await saveProgress('projectile', {
          speed: run.speed,
          angle: run.angle,
          gravity: gravity,
          timeOfFlight: elapsedRef.current,
          range: landingX,
          maxHeight: run.expectedHmax,
          capturedAt: new Date().toISOString(),
        } as ProjectileData);
        
        if (result.success) {
          Alert.alert('Eksperimen Selesai', 'Progres berhasil disimpan!');
        }
      }
      
      activeRunRef.current = null;
      setIsRunning(false);
      return;
    }
    
    // Add point to trail
    trailRef.current.push({ x, y });
    setTrail([...trailRef.current]);
    setCurrentX(x);
    setCurrentY(y);
    setElapsed(elapsedRef.current);
    
    if (isRunning) {
      animationRef.current = requestAnimationFrame(animate);
    }
  }, [calculateDerivedValues, gravity, isRunning, user]);

  // Start/stop animation
  useEffect(() => {
    if (isRunning) {
      lastTimestampRef.current = 0;
      animationRef.current = requestAnimationFrame(animate);
    }
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isRunning, animate]);

  // Start simulation
  const startSimulation = () => {
    if (isRunning) return;
    
    const { expectedRange, expectedHmax, tFlight } = calculateDerivedValues();
    
    activeRunRef.current = {
      speed,
      angle,
      gravity,
      expectedRange,
      expectedHmax,
      startedAt: new Date().toISOString(),
    };
    
    elapsedRef.current = 0;
    trailRef.current = [];
    lastTimestampRef.current = 0;
    
    setTrail([]);
    setCurrentX(0);
    setCurrentY(0);
    setElapsed(0);
    setIsRunning(true);
  };

  // Reset simulation
  const resetSimulation = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    
    elapsedRef.current = 0;
    trailRef.current = [];
    activeRunRef.current = null;
    
    setTrail([]);
    setCurrentX(0);
    setCurrentY(0);
    setElapsed(0);
    setIsRunning(false);
  };

  const scale = getScale();
  const trailPath = generateTrailPath();
  
  // Ball position in pixels
  const ballPx = {
    x: MARGIN_LEFT + currentX * scale.scaleX,
    y: CANVAS_HEIGHT - MARGIN_BOTTOM - currentY * scale.scaleY,
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Canvas */}
        <View style={styles.canvasContainer}>
          <Svg width={CANVAS_WIDTH} height={CANVAS_HEIGHT}>
            <Defs>
              <LinearGradient id="skyGradient" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor="#87CEEB" />
                <Stop offset="100%" stopColor="#E0F4FF" />
              </LinearGradient>
              <LinearGradient id="groundGradient" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor="#4a7c4a" />
                <Stop offset="100%" stopColor="#2d5a2d" />
              </LinearGradient>
            </Defs>
            
            {/* Sky */}
            <Rect
              x={0}
              y={0}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT - MARGIN_BOTTOM}
              fill="url(#skyGradient)"
            />
            
            {/* Ground */}
            <Rect
              x={0}
              y={CANVAS_HEIGHT - MARGIN_BOTTOM}
              width={CANVAS_WIDTH}
              height={MARGIN_BOTTOM}
              fill="url(#groundGradient)"
            />
            
            {/* Y-axis */}
            <Line
              x1={MARGIN_LEFT}
              y1={10}
              x2={MARGIN_LEFT}
              y2={CANVAS_HEIGHT - MARGIN_BOTTOM}
              stroke="#333"
              strokeWidth={1}
            />
            
            {/* X-axis */}
            <Line
              x1={MARGIN_LEFT}
              y1={CANVAS_HEIGHT - MARGIN_BOTTOM}
              x2={CANVAS_WIDTH - 10}
              y2={CANVAS_HEIGHT - MARGIN_BOTTOM}
              stroke="#333"
              strokeWidth={1}
            />
            
            {/* Axis labels */}
            <SvgText
              x={CANVAS_WIDTH / 2}
              y={CANVAS_HEIGHT - 8}
              fill="#333"
              fontSize={10}
              textAnchor="middle"
            >
              Jarak (m)
            </SvgText>
            <SvgText
              x={10}
              y={CANVAS_HEIGHT / 2}
              fill="#333"
              fontSize={10}
              textAnchor="middle"
              rotation="-90"
              origin={`10, ${CANVAS_HEIGHT / 2}`}
            >
              Tinggi (m)
            </SvgText>
            
            {/* Scale markers X */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
              const value = Math.round(scale.maxX * ratio);
              const x = MARGIN_LEFT + (USABLE_WIDTH * ratio);
              return (
                <G key={`x-${ratio}`}>
                  <Line
                    x1={x}
                    y1={CANVAS_HEIGHT - MARGIN_BOTTOM}
                    x2={x}
                    y2={CANVAS_HEIGHT - MARGIN_BOTTOM + 5}
                    stroke="#333"
                    strokeWidth={1}
                  />
                  <SvgText
                    x={x}
                    y={CANVAS_HEIGHT - MARGIN_BOTTOM + 15}
                    fill="#333"
                    fontSize={8}
                    textAnchor="middle"
                  >
                    {value}
                  </SvgText>
                </G>
              );
            })}
            
            {/* Scale markers Y */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
              const value = Math.round(scale.maxY * ratio);
              const y = CANVAS_HEIGHT - MARGIN_BOTTOM - (USABLE_HEIGHT * ratio);
              return (
                <G key={`y-${ratio}`}>
                  <Line
                    x1={MARGIN_LEFT - 5}
                    y1={y}
                    x2={MARGIN_LEFT}
                    y2={y}
                    stroke="#333"
                    strokeWidth={1}
                  />
                  <SvgText
                    x={MARGIN_LEFT - 8}
                    y={y + 3}
                    fill="#333"
                    fontSize={8}
                    textAnchor="end"
                  >
                    {value}
                  </SvgText>
                </G>
              );
            })}
            
            {/* Trail path */}
            {trailPath && (
              <Path
                d={trailPath}
                stroke="#0a58ca"
                strokeWidth={2}
                fill="none"
              />
            )}
            
            {/* Ball */}
            {isRunning && (
              <Circle
                cx={ballPx.x}
                cy={ballPx.y}
                r={6}
                fill="#0dcaf0"
              />
            )}
            
            {/* Launch angle indicator */}
            {!isRunning && (
              <G>
                <Line
                  x1={MARGIN_LEFT}
                  y1={CANVAS_HEIGHT - MARGIN_BOTTOM}
                  x2={MARGIN_LEFT + 50 * Math.cos(degToRad(angle))}
                  y2={CANVAS_HEIGHT - MARGIN_BOTTOM - 50 * Math.sin(degToRad(angle))}
                  stroke="#e74c3c"
                  strokeWidth={2}
                  strokeDasharray="4,4"
                />
                <SvgText
                  x={MARGIN_LEFT + 60 * Math.cos(degToRad(angle / 2))}
                  y={CANVAS_HEIGHT - MARGIN_BOTTOM - 30 * Math.sin(degToRad(angle / 2))}
                  fill="#e74c3c"
                  fontSize={10}
                >
                  {angle}°
                </SvgText>
              </G>
            )}
          </Svg>
          
          {/* Info overlay */}
          <View style={styles.infoOverlay}>
            <Text style={styles.infoText}>t = {elapsed.toFixed(2)} s</Text>
            <Text style={styles.infoText}>x = {currentX.toFixed(2)} m</Text>
            <Text style={styles.infoText}>y = {currentY.toFixed(2)} m</Text>
          </View>
        </View>

        {/* Controls */}
        <View style={styles.controlsCard}>
          <Text style={styles.sectionTitle}>Parameter</Text>
          
          <SliderInput
            label="Kecepatan Awal (v₀)"
            value={speed}
            onValueChange={(val) => {
              setSpeed(val);
              if (!isRunning) resetSimulation();
            }}
            minimumValue={10}
            maximumValue={100}
            step={1}
            unit="m/s"
            disabled={isRunning}
          />
          
          <SliderInput
            label="Sudut Elevasi (θ)"
            value={angle}
            onValueChange={(val) => {
              setAngle(val);
              if (!isRunning) resetSimulation();
            }}
            minimumValue={5}
            maximumValue={85}
            step={1}
            unit="°"
            disabled={isRunning}
          />
          
          <SliderInput
            label="Gravitasi (g)"
            value={gravity}
            onValueChange={(val) => {
              setGravity(val);
              if (!isRunning) resetSimulation();
            }}
            minimumValue={1}
            maximumValue={20}
            step={0.01}
            unit="m/s²"
            disabled={isRunning}
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
            <Text style={styles.primaryButtonText}>Luncurkan</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={resetSimulation}
          >
            <Ionicons name="refresh" size={20} color="#1b2a4e" />
            <Text style={styles.secondaryButtonText}>Reset</Text>
          </TouchableOpacity>
        </View>

        {/* Results */}
        <View style={styles.resultsCard}>
          <Text style={styles.sectionTitle}>Nilai Teoritis</Text>
          
          <View style={styles.resultRow}>
            <Text style={styles.resultLabel}>Waktu Terbang:</Text>
            <Text style={styles.resultValue}>{derived.tFlight.toFixed(3)} s</Text>
          </View>
          
          <View style={styles.resultRow}>
            <Text style={styles.resultLabel}>Jangkauan Horizontal:</Text>
            <Text style={styles.resultValue}>{derived.expectedRange.toFixed(2)} m</Text>
          </View>
          
          <View style={styles.resultRow}>
            <Text style={styles.resultLabel}>Tinggi Maksimum:</Text>
            <Text style={styles.resultValue}>{derived.expectedHmax.toFixed(2)} m</Text>
          </View>
          
          <View style={styles.resultRow}>
            <Text style={styles.resultLabel}>Komponen v₀ₓ:</Text>
            <Text style={styles.resultValue}>{derived.vx.toFixed(2)} m/s</Text>
          </View>
          
          <View style={styles.resultRow}>
            <Text style={styles.resultLabel}>Komponen v₀ᵧ:</Text>
            <Text style={styles.resultValue}>{derived.vy.toFixed(2)} m/s</Text>
          </View>
        </View>

        {/* Theory Card */}
        <View style={styles.theoryCard}>
          <Text style={styles.sectionTitle}>Rumus Gerak Parabola</Text>
          <View style={styles.formulaContainer}>
            <Text style={styles.formulaText}>x = v₀ cos(θ) × t</Text>
            <Text style={styles.formulaText}>y = v₀ sin(θ) × t - ½gt²</Text>
            <Text style={styles.formulaText}>R = v₀² sin(2θ) / g</Text>
            <Text style={styles.formulaText}>H = v₀² sin²(θ) / 2g</Text>
          </View>
          <Text style={styles.theoryText}>
            Gerak parabola adalah gabungan gerak lurus beraturan (GLB) pada sumbu horizontal 
            dan gerak lurus berubah beraturan (GLBB) pada sumbu vertikal. Sudut 45° memberikan 
            jangkauan maksimum untuk kecepatan awal yang sama.
          </Text>
        </View>

        {/* Quiz Card */}
        <QuizCard experiment="projectile" title="Kuis Gerak Parabola" />
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
    backgroundColor: '#fff',
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
    right: 10,
    backgroundColor: 'rgba(27, 42, 78, 0.9)',
    padding: 10,
    borderRadius: 8,
  },
  infoText: {
    color: '#fff',
    fontSize: 12,
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
    fontSize: 16,
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
