import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Alert,
  Dimensions,
} from 'react-native';
import Signature from 'react-native-signature-canvas';

const { width, height } = Dimensions.get('window');

export default function SignatureCapture({
  visible,
  onClose,
  onSave,
  title = 'Passenger Signature',
  signerName = '',
  signatureType = 'pickup'
}) {
  const signatureRef = useRef(null);
  const [hasSignature, setHasSignature] = useState(false);

  const handleSignature = (signature) => {
    console.log('Signature captured:', signature.substring(0, 50));
    setHasSignature(true);
  };

  const handleEmpty = () => {
    console.log('Signature is empty');
    setHasSignature(false);
  };

  const handleClear = () => {
    signatureRef.current?.clearSignature();
    setHasSignature(false);
  };

  const handleConfirm = () => {
    signatureRef.current?.readSignature();
  };

  const handleEnd = () => {
    signatureRef.current?.readSignature();
  };

  const handleData = (data) => {
    if (data && data.length > 100) {
      onSave({
        signature_data: data,
        signature_type: signatureType,
        signer_name: signerName,
        signed_at: new Date().toISOString(),
      });
      handleClear();
      onClose();
    } else {
      Alert.alert('Invalid Signature', 'Please provide a valid signature.');
    }
  };

  const style = `.m-signature-pad {
    box-shadow: none;
    border: none;
  }
  .m-signature-pad--body {
    border: none;
  }
  .m-signature-pad--footer {
    display: none;
    margin: 0;
  }
  body,html {
    width: 100%;
    height: 100%;
  }`;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>
            {signatureType === 'pickup' ? 'Sign to confirm pickup' : 'Sign to confirm dropoff'}
          </Text>
          {signerName ? (
            <Text style={styles.signerName}>Passenger: {signerName}</Text>
          ) : null}
        </View>

        <View style={styles.signatureContainer}>
          <Signature
            ref={signatureRef}
            onOK={handleData}
            onEmpty={handleEmpty}
            onEnd={handleEnd}
            descriptionText=""
            clearText="Clear"
            confirmText="Save"
            webStyle={style}
            autoClear={false}
            imageType="image/png"
          />
        </View>

        <View style={styles.instructions}>
          <Text style={styles.instructionText}>
            ✍️ Please sign above using your finger
          </Text>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.button, styles.clearButton]}
            onPress={handleClear}
          >
            <Text style={styles.buttonText}>Clear</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={onClose}
          >
            <Text style={styles.buttonText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.confirmButton]}
            onPress={handleConfirm}
          >
            <Text style={styles.confirmButtonText}>Save Signature</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    backgroundColor: '#2563eb',
    padding: 24,
    paddingTop: 60,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#bfdbfe',
    marginBottom: 8,
  },
  signerName: {
    fontSize: 14,
    color: '#dbeafe',
    fontWeight: '600',
  },
  signatureContainer: {
    flex: 1,
    margin: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#2563eb',
    borderStyle: 'dashed',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  instructions: {
    padding: 16,
    alignItems: 'center',
  },
  instructionText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearButton: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  cancelButton: {
    backgroundColor: '#ef4444',
  },
  confirmButton: {
    backgroundColor: '#10b981',
    flex: 1.5,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
