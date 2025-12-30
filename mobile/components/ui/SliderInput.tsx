import { View, Text, StyleSheet } from 'react-native';
import Slider from '@react-native-community/slider';

interface SliderInputProps {
  label: string;
  value: number;
  onValueChange: (value: number) => void;
  minimumValue: number;
  maximumValue: number;
  step?: number;
  unit?: string;
}

export function SliderInput({
  label,
  value,
  onValueChange,
  minimumValue,
  maximumValue,
  step = 1,
  unit = '',
}: SliderInputProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>
          {value.toFixed(step < 1 ? 2 : 0)} {unit}
        </Text>
      </View>
      <Slider
        style={styles.slider}
        value={value}
        onValueChange={onValueChange}
        minimumValue={minimumValue}
        maximumValue={maximumValue}
        step={step}
        minimumTrackTintColor="#0a58ca"
        maximumTrackTintColor="#dbe6ff"
        thumbTintColor="#0a58ca"
      />
      <View style={styles.rangeLabels}>
        <Text style={styles.rangeLabel}>{minimumValue}{unit}</Text>
        <Text style={styles.rangeLabel}>{maximumValue}{unit}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    color: '#1b2a4e',
    fontSize: 14,
    fontWeight: '600',
  },
  value: {
    color: '#0a58ca',
    fontSize: 16,
    fontWeight: 'bold',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  rangeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rangeLabel: {
    color: '#3e4a6b',
    fontSize: 12,
  },
});
