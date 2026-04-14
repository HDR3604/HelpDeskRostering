package service_test

import (
	"crypto/rand"
	"testing"

	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/crypto"
)

func BenchmarkCrypto_Encrypt(b *testing.B) {
	key := make([]byte, 32)
	if _, err := rand.Read(key); err != nil {
		b.Fatalf("generate key: %v", err)
	}
	plaintext := "1234-5678-9012-3456" // typical bank account number

	b.ReportAllocs()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, err := crypto.Encrypt(plaintext, key)
		if err != nil {
			b.Fatalf("Encrypt: %v", err)
		}
	}
}

func BenchmarkCrypto_Decrypt(b *testing.B) {
	key := make([]byte, 32)
	if _, err := rand.Read(key); err != nil {
		b.Fatalf("generate key: %v", err)
	}
	plaintext := "1234-5678-9012-3456"
	ciphertext, err := crypto.Encrypt(plaintext, key)
	if err != nil {
		b.Fatalf("setup Encrypt: %v", err)
	}

	b.ReportAllocs()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, err := crypto.Decrypt(ciphertext, key)
		if err != nil {
			b.Fatalf("Decrypt: %v", err)
		}
	}
}

func BenchmarkCrypto_RoundTrip(b *testing.B) {
	key := make([]byte, 32)
	if _, err := rand.Read(key); err != nil {
		b.Fatalf("generate key: %v", err)
	}
	plaintext := "1234-5678-9012-3456"

	b.ReportAllocs()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		ct, err := crypto.Encrypt(plaintext, key)
		if err != nil {
			b.Fatalf("Encrypt: %v", err)
		}
		_, err = crypto.Decrypt(ct, key)
		if err != nil {
			b.Fatalf("Decrypt: %v", err)
		}
	}
}
