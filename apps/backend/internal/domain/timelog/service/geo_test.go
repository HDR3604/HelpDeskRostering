package service

import (
	"math"
	"testing"

	"github.com/stretchr/testify/suite"
)

type GeoTestSuite struct {
	suite.Suite
}

func TestGeoTestSuite(t *testing.T) {
	suite.Run(t, new(GeoTestSuite))
}

func (s *GeoTestSuite) TestKnownDistance_LondonToNewYork() {
	// London: 51.5074, -0.1278
	// New York: 40.7128, -74.0060
	// Expected: ~5570 km
	dist := haversineDistance(51.5074, -0.1278, 40.7128, -74.0060)
	s.InDelta(5570000, dist, 15000, "London to New York should be ~5570 km")
}

func (s *GeoTestSuite) TestKnownDistance_SamePoint() {
	dist := haversineDistance(10.642707, -61.277001, 10.642707, -61.277001)
	s.InDelta(0, dist, 0.01, "same point should have zero distance")
}

func (s *GeoTestSuite) TestKnownDistance_ShortDistance() {
	// Two points ~100m apart near UWI campus
	// 10.642707, -61.277001 to ~10.643607, -61.277001 (about 100m north)
	dist := haversineDistance(10.642707, -61.277001, 10.643607, -61.277001)
	s.InDelta(100, dist, 5, "should be approximately 100 meters")
}

func (s *GeoTestSuite) TestKnownDistance_Antipodal() {
	// North pole to south pole
	dist := haversineDistance(90, 0, -90, 0)
	expected := math.Pi * 6371000 // half circumference
	s.InDelta(expected, dist, 100, "pole to pole should be ~20015 km")
}

func (s *GeoTestSuite) TestKnownDistance_Equator() {
	// Two points on the equator, 1 degree apart
	// At equator, 1 degree ≈ 111.32 km
	dist := haversineDistance(0, 0, 0, 1)
	s.InDelta(111320, dist, 200, "1 degree on equator should be ~111 km")
}
