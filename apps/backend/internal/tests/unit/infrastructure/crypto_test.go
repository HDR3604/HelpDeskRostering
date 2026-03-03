package infrastructure_test

import (
	"testing"

	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/crypto"
)

func TestEncryptDecrypt(t *testing.T) {
	key := []byte("0123456789abcdef0123456789abcdef") // 32 bytes

	plaintext := "12345678"
	ciphertext, err := crypto.Encrypt(plaintext, key)
	if err != nil {
		t.Fatalf("Encrypt failed: %v", err)
	}

	decrypted, err := crypto.Decrypt(ciphertext, key)
	if err != nil {
		t.Fatalf("Decrypt failed: %v", err)
	}

	if decrypted != plaintext {
		t.Errorf("Expected %q, got %q", plaintext, decrypted)
	}
}

func TestEncryptWithWrongKeyLength(t *testing.T) {
	key := []byte("tooshort")
	plaintext := "12345678"

	_, err := crypto.Encrypt(plaintext, key)
	if err == nil {
		t.Errorf("Expected error with wrong key length, got nil")
	}
}

func TestDecryptWithWrongKey(t *testing.T) {
	key1 := []byte("0123456789abcdef0123456789abcdef")
	key2 := []byte("fedcba9876543210fedcba9876543210")

	plaintext := "12345678"
	ciphertext, err := crypto.Encrypt(plaintext, key1)
	if err != nil {
		t.Fatalf("Encrypt failed: %v", err)
	}

	_, err = crypto.Decrypt(ciphertext, key2)
	if err == nil {
		t.Errorf("Expected error when decrypting with wrong key, got nil")
	}
}

func TestDecryptWithCorruptedCiphertext(t *testing.T) {
	key := []byte("0123456789abcdef0123456789abcdef")

	// Corrupt ciphertext by modifying it
	corrupted := []byte("0123456789abcdef0123456789abcdef0123456789abcdef")
	_, err := crypto.Decrypt(corrupted, key)
	if err == nil {
		t.Errorf("Expected error when decrypting corrupted ciphertext, got nil")
	}
}

func TestEncryptDifferentInputs(t *testing.T) {
	key := []byte("0123456789abcdef0123456789abcdef")

	inputs := []string{
		"12345678",
		"87654321",
		"11111111",
	}

	ciphertexts := make(map[string]bool)
	for _, input := range inputs {
		ct, err := crypto.Encrypt(input, key)
		if err != nil {
			t.Fatalf("Encrypt failed for %q: %v", input, err)
		}
		ciphertexts[string(ct)] = true
	}

	// Verify all ciphertexts are different (due to random nonce)
	if len(ciphertexts) != len(inputs) {
		t.Errorf("Expected %d different ciphertexts, got %d", len(inputs), len(ciphertexts))
	}
}
