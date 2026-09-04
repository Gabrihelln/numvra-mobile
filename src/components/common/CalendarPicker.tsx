import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TouchableWithoutFeedback,
} from 'react-native';
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { spacing, borderRadius, typography } from '../../theme';

interface CalendarPickerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date;
  onSelect: (date: Date) => void;
}

export const CalendarPicker: React.FC<CalendarPickerProps> = ({
  isOpen,
  onClose,
  selectedDate,
  onSelect,
}) => {
  const { colors, isDarkMode } = useTheme();
  const [currentMonth, setCurrentMonth] = useState<Date>(selectedDate || new Date());

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 0 }),
    end: endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 0 }),
  });

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const weekDays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View
              style={[
                styles.modalCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
              ]}
            >
              {/* Header: Navegação de Mês */}
              <View style={styles.header}>
                <TouchableOpacity
                  onPress={prevMonth}
                  style={[styles.navButton, { backgroundColor: colors.surface }]}
                  activeOpacity={0.7}
                >
                  <ChevronLeft size={20} color={colors.textSecondary} />
                </TouchableOpacity>

                <Text style={[styles.monthTitle, { color: colors.text }]}>
                  {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
                </Text>

                <TouchableOpacity
                  onPress={nextMonth}
                  style={[styles.navButton, { backgroundColor: colors.surface }]}
                  activeOpacity={0.7}
                >
                  <ChevronRight size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Dias da semana */}
              <View style={styles.weekDaysRow}>
                {weekDays.map((day, i) => (
                  <View key={`${day}-${i}`} style={styles.weekDayCell}>
                    <Text style={[styles.weekDayText, { color: colors.textMuted }]}>
                      {day}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Grid de Dias */}
              <View style={styles.daysGrid}>
                {days.map((day, idx) => {
                  const isSelected = isSameDay(day, selectedDate);
                  const inCurrentMonth = isSameMonth(day, currentMonth);
                  const isTodayDate = isToday(day);

                  return (
                    <TouchableOpacity
                      key={idx}
                      onPress={() => {
                        onSelect(day);
                        onClose();
                      }}
                      style={[
                        styles.dayCell,
                        isSelected && {
                          backgroundColor: colors.primary,
                        },
                      ]}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.dayText,
                          {
                            color: isSelected
                              ? '#ffffff'
                              : inCurrentMonth
                              ? colors.text
                              : colors.textMuted,
                            opacity: inCurrentMonth || isSelected ? 1 : 0.4,
                            fontWeight: isSelected ? '700' : '600',
                          },
                        ]}
                      >
                        {format(day, 'd')}
                      </Text>
                      {isTodayDate && !isSelected && (
                        <View
                          style={[
                            styles.todayIndicator,
                            { backgroundColor: colors.primary },
                          ]}
                        />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Botão Cancelar */}
              <TouchableOpacity
                onPress={onClose}
                style={[styles.cancelButton, { backgroundColor: colors.surface }]}
                activeOpacity={0.7}
              >
                <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>
                  Cancelar
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 32,
    borderWidth: 1,
    padding: spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthTitle: {
    ...typography.h3,
    textTransform: 'capitalize',
  },
  weekDaysRow: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },
  weekDayCell: {
    flex: 1,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekDayText: {
    fontSize: 11,
    fontWeight: '800',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: `${100 / 7}%`,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
    position: 'relative',
    marginVertical: 1,
  },
  dayText: {
    fontSize: 14,
  },
  todayIndicator: {
    position: 'absolute',
    bottom: 4,
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  cancelButton: {
    width: '100%',
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    ...typography.button,
  },
});
