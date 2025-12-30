import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Keyboard } from 'react-native';
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';

interface SliderInputProps {
  label: string;
  value: number;
  onValueChange: (value: number) => void;
  minimumValue: number;
  maximumValue: number;
  step?: number;
  unit?: string;
  disabled?: boolean;
}

export function SliderInput({
  label,
  value,
  onValueChange,
  minimumValue,
  maximumValue,
  step = 1,
  unit = '',
  disabled = false,
}: SliderInputProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(value.toString());
  
  // Update input value when external value changes
  useEffect(() => {
    if (!isEditing) {
      setInputValue(step < 1 ? value.toFixed(2) : value.toFixed(0));
    }
  }, [value, step, isEditing]);

  const handleInputChange = (text: string) => {
    // Allow numbers, decimal point, and negative sign
    const sanitized = text.replace(/[^0-9.-]/g, '');
    setInputValue(sanitized);
  };

  const handleInputSubmit = () => {
    const numValue = parseFloat(inputValue);
    
    if (!isNaN(numValue)) {
      // Clamp value between min and max
      const clampedValue = Math.min(Math.max(numValue, minimumValue), maximumValue);
      // Round to step
      const steppedValue = Math.round(clampedValue / step) * step;
      onValueChange(steppedValue);
      setInputValue(step < 1 ? steppedValue.toFixed(2) : steppedValue.toFixed(0));
    } else {
      // Reset to current value if invalid
      setInputValue(step < 1 ? value.toFixed(2) : value.toFixed(0));
    }
    
    setIsEditing(false);
    Keyboard.dismiss();
  };

  const handleInputFocus = () => {
    if (!disabled) {
      setIsEditing(true);
      setInputValue(''); // Clear for easier typing
    }
  };

  const handleInputBlur = () => {
    if (inputValue === '') {
      setInputValue(step < 1 ? value.toFixed(2) : value.toFixed(0));
    } else {
      handleInputSubmit();
    }
    setIsEditing(false);
  };

  // Increment/decrement buttons
  const increment = () => {
    if (disabled) return;
    const newValue = Math.min(value + step, maximumValue);
    const steppedValue = Math.round(newValue / step) * step;
    onValueChange(steppedValue);
  };

  const decrement = () => {
    if (disabled) return;
    const newValue = Math.max(value - step, minimumValue);
    const steppedValue = Math.round(newValue / step) * step;
    onValueChange(steppedValue);
  };

  return (
    <View style={[styles.container, disabled && styles.containerDisabled]}>
      <View style={styles.header}>
        <Text style={[styles.label, disabled && styles.labelDisabled]}>{label}</Text>
        <View style={styles.valueContainer}>
          <TouchableOpacity 
            onPress={decrement} 
            style={[styles.stepButton, disabled && styles.stepButtonDisabled]}
            disabled={disabled || value <= minimumValue}
          >
            <Ionicons name="remove" size={16} color={disabled ? '#ccc' : '#0a58ca'} />
          </TouchableOpacity>
          
          <TextInput
            style={[
              styles.valueInput,
              isEditing && styles.valueInputActive,
              disabled && styles.valueInputDisabled
            ]}
            value={inputValue}
            onChangeText={handleInputChange}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            onSubmitEditing={handleInputSubmit}
            keyboardType="numeric"
            returnKeyType="done"
            selectTextOnFocus
            editable={!disabled}
          />
          <Text style={[styles.unitText, disabled && styles.unitTextDisabled]}>{unit}</Text>
          
          <TouchableOpacity 
            onPress={increment} 
            style={[styles.stepButton, disabled && styles.stepButtonDisabled]}
            disabled={disabled || value >= maximumValue}
          >
            <Ionicons name="add" size={16} color={disabled ? '#ccc' : '#0a58ca'} />
          </TouchableOpacity>
        </View>
      </View>
      
      <Slider
        style={styles.slider}
        value={value}
        onValueChange={onValueChange}
        minimumValue={minimumValue}
        maximumValue={maximumValue}
        step={step}
        minimumTrackTintColor={disabled ? '#ccc' : '#0a58ca'}
        maximumTrackTintColor="#dbe6ff"
        thumbTintColor={disabled ? '#ccc' : '#0a58ca'}
        disabled={disabled}
      />
      
      <View style={styles.rangeLabels}>
        <Text style={[styles.rangeLabel, disabled && styles.rangeLabelDisabled]}>
          {minimumValue}{unit}
        </Text>
        <Text style={[styles.rangeLabel, disabled && styles.rangeLabelDisabled]}>
          {maximumValue}{unit}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  containerDisabled: {
    opacity: 0.7,
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
    flex: 1,
  },
  labelDisabled: {
    color: '#999',
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stepButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f0f7ff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#dbe6ff',
  },
  stepButtonDisabled: {
    backgroundColor: '#f5f5f5',
    borderColor: '#e0e0e0',
  },
  valueInput: {
    color: '#0a58ca',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    minWidth: 60,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#f5f9ff',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  valueInputActive: {
    borderColor: '#0a58ca',
    backgroundColor: '#ffffff',
  },
  valueInputDisabled: {
    color: '#999',
    backgroundColor: '#f0f0f0',
  },
  unitText: {
    color: '#3e4a6b',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 2,
  },
  unitTextDisabled: {
    color: '#999',
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
  rangeLabelDisabled: {
    color: '#999',
  },
});
