// src/components/AddSpotSheet.tsx — add-spot form CONTENT (SPEC §9, §13, §17; task T9).
// App.tsx wraps this in a BottomSheetModal (T10) — this file never presents itself:
// props down (`active`, `pin`, `submitState`), callbacks up (`onCancel`, `onSubmit`).
// No network calls, no Supabase at runtime (type-only import, G3), no toasts (G6),
// zero hex — every color/radius/touch size comes from useTheme tokens (G5, SPEC §12).

import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
// Type-only import — the component never touches Supabase at runtime (G3).
import type { SpotPayload, SpotType, WaterValue } from '../lib/supabase';
// Canonical labels/glyphs live only here (G5) — no duplicated label constants below.
import { SPOT_TYPES, UNKNOWN_LABEL, WATER_LABELS } from '../lib/spotView';
import { useTheme } from '../theme/tokens';

// The honest submit machine (G2) — App.tsx owns the transitions, this file renders them.
export type AddSpotSubmitState = 'idle' | 'pending' | 'success' | 'error';

type Props = {
  /** True while the add flow is open; reopening while `idle` resets the form. */
  active?: boolean;
  /** Dropped pin from MapPane — submit stays disabled until it exists (SPEC §17). */
  pin: { lat: number; lng: number } | null;
  submitState: AddSpotSubmitState;
  /** Intent only — App closes the sheet, resets state and toasts the truth. */
  onCancel: () => void;
  /** Intent only — App writes to Supabase via SpotContext and reports back via `submitState`. */
  onSubmit: (payload: SpotPayload) => void;
};

// Chip sources read once — keys are typed straight from the canonical records (G5).
const TYPE_KEYS = Object.keys(SPOT_TYPES) as SpotType[];
const WATER_KEYS = Object.keys(WATER_LABELS) as WaterValue[];

// Tri-state 'Ramah perempuan' (SPEC §6: null = belum ada info — never guessed, G4).
const WOMEN_OPTIONS: { value: boolean | null; label: string }[] = [
  { value: true, label: 'Ya' },
  { value: false, label: 'Tidak' },
  { value: null, label: UNKNOWN_LABEL },
];

export function AddSpotSheet({
  active = false,
  pin,
  submitState,
  onCancel,
  onSubmit,
}: Props) {
  const { tokens, tints } = useTheme();

  const [name, setName] = useState('');
  const [type, setType] = useState<SpotType | null>(null);
  const [water, setWater] = useState<WaterValue | null>(null);
  const [hours, setHours] = useState('');
  const [bikeParking, setBikeParking] = useState(false);
  const [women, setWomen] = useState<boolean | null>(null);
  const [notes, setNotes] = useState('');
  const [showErrors, setShowErrors] = useState(false);

  const locked = submitState === 'pending'; // G2 — form locked while sending, no fake success
  const pinMissing = pin === null;
  const nameMissing = name.trim() === '';

  // Reopening the sheet while idle starts a clean form. Errors keep the sheet open with
  // its content intact (G2) — the reset only fires when App presents it again in `idle`.
  useEffect(() => {
    if (active && submitState === 'idle') {
      setName('');
      setType(null);
      setWater(null);
      setHours('');
      setBikeParking(false);
      setWomen(null);
      setNotes('');
      setShowErrors(false);
    }
  }, [active, submitState]);

  // Inline validation (Indonesian, never an alert) — surfaced after the first submit try.
  const nameError = showErrors && nameMissing;
  const typeError = showErrors && type === null;
  const waterError = showErrors && water === null;

  const handleSubmit = () => {
    if (submitState !== 'idle' || pin === null) return; // honest pinning (SPEC §17)
    if (nameMissing || type === null || water === null) {
      setShowErrors(true);
      return;
    }
    // Payload boundary (G4): every '' becomes null — the database never stores empty strings.
    onSubmit({
      name: name.trim(),
      type,
      lat: pin.lat,
      lng: pin.lng,
      water,
      hours: hours.trim() === '' ? null : hours.trim(),
      bike_parking: bikeParking,
      women_friendly: women,
      notes: notes.trim() === '' ? null : notes.trim(),
    });
  };

  // Success panel REPLACES the form — shown only after the database confirmed (G2).
  if (submitState === 'success') {
    return (
      <View
        style={[styles.successRoot, { backgroundColor: tokens.bg }]}
        accessibilityLiveRegion="polite"
      >
        <View style={[styles.successBadge, { backgroundColor: tokens.success }]}>
          <Text style={[styles.successBadgeGlyph, { color: tokens.onPrimary }]}>✓</Text>
        </View>
        <Text style={[styles.successTitle, { color: tokens.ink }]}>Terima kasih!</Text>
        <Text style={[styles.successText, { color: tokens.ink2 }]}>
          Spot kamu menunggu persetujuan.
        </Text>
        <TouchableOpacity
          style={[styles.cta, { backgroundColor: tokens.primary }]}
          onPress={onCancel}
          accessibilityRole="button"
          accessibilityLabel="Kembali ke peta"
        >
          <Text style={[styles.ctaText, { color: tokens.onPrimary }]}>Kembali ke peta</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: tokens.bg }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: tokens.ink }]}>Info spot</Text>
        <TouchableOpacity
          style={[
            styles.cancelBtn,
            { borderRadius: tokens.radiusButton, minHeight: tokens.touchMin },
          ]}
          onPress={onCancel}
          accessibilityRole="button"
          accessibilityLabel="Batal, tutup formulir tambah spot"
        >
          <Text style={[styles.cancelText, { color: tokens.ink2 }]}>Batal</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Nama spot */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: tokens.ink2 }]}>Nama spot</Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: tokens.surface,
                borderColor: tokens.ink2,
                color: tokens.ink,
                borderRadius: tokens.radiusButton,
                minHeight: tokens.touchMin,
              },
            ]}
            value={name}
            onChangeText={setName}
            placeholder="cth: Musala Jami Al-Ikhlas"
            placeholderTextColor={tokens.ink2}
            editable={!locked}
            accessibilityLabel="Nama spot"
          />
          {nameError ? (
            <Text style={[styles.errorText, { color: tokens.amber }]}>
              Nama spot wajib diisi.
            </Text>
          ) : null}
        </View>

        {/* Jenis — 5 chips from SPOT_TYPES; the selected chip wears its type tint */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: tokens.ink2 }]}>Jenis</Text>
          <View
            style={styles.chipRow}
            accessibilityRole="radiogroup"
            accessibilityLabel="Jenis spot"
          >
            {TYPE_KEYS.map((key) => {
              const tint = tints[SPOT_TYPES[key].cls];
              const selected = type === key;
              return (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: selected ? tint.soft : tokens.surface,
                      borderColor: selected ? tint.main : tokens.ink2,
                      borderRadius: tokens.radiusButton,
                      minHeight: tokens.touchMin,
                      opacity: locked ? 0.5 : 1,
                    },
                  ]}
                  onPress={() => setType(key)}
                  disabled={locked}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected, disabled: locked }}
                  accessibilityLabel={SPOT_TYPES[key].label}
                >
                  <Text
                    style={[styles.chipText, { color: selected ? tint.ink : tokens.ink2 }]}
                  >
                    {SPOT_TYPES[key].label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {typeError ? (
            <Text style={[styles.errorText, { color: tokens.amber }]}>
              Pilih jenis spot dulu.
            </Text>
          ) : null}
        </View>

        {/* Lokasi — the dropped pin, honest when there is none yet (SPEC §17) */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: tokens.ink2 }]}>Lokasi</Text>
          <View
            style={[
              styles.inputBox,
              {
                backgroundColor: tokens.surface2,
                borderColor: tokens.ink2,
                borderRadius: tokens.radiusButton,
                minHeight: tokens.touchMin,
              },
            ]}
          >
            <Text
              style={[
                styles.locationValue,
                { color: pin ? tokens.ink : tokens.ink2 },
              ]}
              accessibilityLabel={
                pin
                  ? `Lokasi terpilih: ${pin.lat.toFixed(6)}, ${pin.lng.toFixed(6)}`
                  : 'Lokasi belum dipilih'
              }
            >
              {pin
                ? `${pin.lat.toFixed(6)}, ${pin.lng.toFixed(6)}`
                : 'Ketuk peta untuk menaruh pin'}
            </Text>
          </View>
          {pin ? (
            <Text style={[styles.hint, { color: tokens.ink2 }]}>
              Geser pin di peta bila perlu
            </Text>
          ) : null}
        </View>

        {/* Air — 4 chips from WATER_LABELS; wajib dipilih (no silent default) */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: tokens.ink2 }]}>Air</Text>
          <View
            style={styles.chipRow}
            accessibilityRole="radiogroup"
            accessibilityLabel="Air"
          >
            {WATER_KEYS.map((key) => {
              const selected = water === key;
              return (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: selected ? tokens.primarySoft : tokens.surface,
                      borderColor: selected ? tokens.primary : tokens.ink2,
                      borderRadius: tokens.radiusButton,
                      minHeight: tokens.touchMin,
                      opacity: locked ? 0.5 : 1,
                    },
                  ]}
                  onPress={() => setWater(key)}
                  disabled={locked}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected, disabled: locked }}
                  accessibilityLabel={WATER_LABELS[key]}
                >
                  <Text
                    style={[styles.chipText, { color: selected ? tokens.ink : tokens.ink2 }]}
                  >
                    {WATER_LABELS[key]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {waterError ? (
            <Text style={[styles.errorText, { color: tokens.amber }]}>
              Pilih sumber air dulu.
            </Text>
          ) : null}
        </View>

        {/* Jam */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: tokens.ink2 }]}>Jam</Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: tokens.surface,
                borderColor: tokens.ink2,
                color: tokens.ink,
                borderRadius: tokens.radiusButton,
                minHeight: tokens.touchMin,
              },
            ]}
            value={hours}
            onChangeText={setHours}
            placeholder="24 jam"
            placeholderTextColor={tokens.ink2}
            editable={!locked}
            accessibilityLabel="Jam"
          />
          <Text style={[styles.hint, { color: tokens.ink2 }]}>mis. 24 jam</Text>
        </View>

        {/* Parkir sepeda — the whole row is the ≥44px target; the native Switch
            (31px tall) is its visual, hidden from screen readers to avoid a
            second sub-minimum focus target. */}
        <TouchableOpacity
          style={[
            styles.switchRow,
            {
              backgroundColor: tokens.surface,
              borderColor: tokens.ink2,
              borderRadius: tokens.radiusButton,
              minHeight: tokens.touchMin,
            },
          ]}
          disabled={locked}
          activeOpacity={0.8}
          onPress={() => setBikeParking((v) => !v)}
          accessibilityRole="switch"
          accessibilityState={{ checked: bikeParking, disabled: locked }}
          accessibilityLabel="Parkir sepeda"
        >
          <Text style={[styles.switchLabel, { color: tokens.ink }]}>Parkir sepeda</Text>
          <View
            pointerEvents="none"
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            <Switch
              value={bikeParking}
              onValueChange={setBikeParking}
              disabled={locked}
              trackColor={{ false: tokens.ink2, true: tokens.primary }}
              thumbColor={tokens.surface}
              ios_backgroundColor={tokens.ink2}
            />
          </View>
        </TouchableOpacity>

        {/* Ramah perempuan — tri-state, null is an honest answer (G4) */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: tokens.ink2 }]}>Ramah perempuan</Text>
          <View
            style={styles.chipRow}
            accessibilityRole="radiogroup"
            accessibilityLabel="Ramah perempuan"
          >
            {WOMEN_OPTIONS.map((option) => {
              const selected = women === option.value;
              return (
                <TouchableOpacity
                  key={option.label}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: selected ? tokens.primarySoft : tokens.surface,
                      borderColor: selected ? tokens.primary : tokens.ink2,
                      borderRadius: tokens.radiusButton,
                      minHeight: tokens.touchMin,
                      opacity: locked ? 0.5 : 1,
                    },
                  ]}
                  onPress={() => setWomen(option.value)}
                  disabled={locked}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected, disabled: locked }}
                  accessibilityLabel={option.label}
                >
                  <Text
                    style={[styles.chipText, { color: selected ? tokens.ink : tokens.ink2 }]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Catatan */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: tokens.ink2 }]}>Catatan</Text>
          <TextInput
            style={[
              styles.input,
              styles.notesInput,
              {
                backgroundColor: tokens.surface,
                borderColor: tokens.ink2,
                color: tokens.ink,
                borderRadius: tokens.radiusButton,
              },
            ]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Izin dulu ke marbot kalau mau tidur, bilang saya musafir"
            placeholderTextColor={tokens.ink2}
            multiline
            textAlignVertical="top"
            editable={!locked}
            accessibilityLabel="Catatan"
          />
        </View>

        {/* G2 — failure keeps the form open with its content intact; neutral, no blame,
            no toast here (App toasts the truth). */}
        {submitState === 'error' ? (
          <View
            style={[
              styles.errorNote,
              {
                backgroundColor: tokens.amberSoft,
                borderRadius: tokens.radiusButton,
              },
            ]}
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
          >
            <Text style={[styles.errorNoteText, { color: tokens.amber }]}>
              Kirim gagal. Coba lagi.
            </Text>
          </View>
        ) : null}

        {/* Submit block — fixed 190×44 CTA, never flex:1 (owner sizing lesson, SPEC §12) */}
        <View style={styles.submitBlock}>
          <Text style={[styles.reassure, { color: tokens.ink2 }]}>
            Spot baru diperiksa dulu sebelum tampil di peta.
          </Text>
          <TouchableOpacity
            style={[
              styles.cta,
              {
                backgroundColor: tokens.primary,
                opacity: pinMissing || locked ? 0.5 : 1,
              },
            ]}
            onPress={handleSubmit}
            disabled={pinMissing || locked}
            accessibilityRole="button"
            accessibilityLabel="Kirim untuk ditinjau"
            accessibilityState={{ disabled: pinMissing || locked }}
          >
            <Text style={[styles.ctaText, { color: tokens.onPrimary }]}>
              {locked ? 'Mengirim…' : 'Kirim untuk ditinjau'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  headerTitle: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 18 },
  cancelBtn: {
    paddingHorizontal: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24 },
  field: { marginBottom: 16 },
  label: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 12, marginBottom: 6 },
  input: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 14,
  },
  notesInput: { minHeight: 96 },
  inputBox: {
    borderWidth: 1,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  locationValue: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 14 },
  hint: { fontFamily: 'PlusJakartaSans_500Medium', fontSize: 12, marginTop: 6 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  chipText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13 },
  switchRow: {
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 16,
  },
  switchLabel: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14 },
  errorText: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 12, marginTop: 6 },
  errorNote: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  errorNoteText: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 13 },
  submitBlock: { alignItems: 'center', marginTop: 4, marginBottom: 8 },
  reassure: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 10,
  },
  // Fixed-size submit CTA — the owner sizing lesson: never reuse flex:1 here (SPEC §12).
  cta: {
    width: 190,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14 },
  successRoot: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 48,
    paddingBottom: 32,
  },
  successBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  successBadgeGlyph: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 26 },
  successTitle: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 22,
    marginBottom: 6,
  },
  successText: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
});

export default AddSpotSheet;
