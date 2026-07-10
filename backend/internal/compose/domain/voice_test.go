package domain

import "testing"

func TestSelectVoice(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name       string
		themeArea  ThemeArea
		format     Format
		wantVoice  Voice
		wantErr    bool
	}{
		{"tutorial → confessional", ThemeBackendInfra, FormatTutorial, VoiceConfessional, false},
		{"deep_dive + backend_infra → clean_technical", ThemeBackendInfra, FormatDeepDive, VoiceCleanTechnical, false},
		{"deep_dive + ai → clean_technical", ThemeAI, FormatDeepDive, VoiceCleanTechnical, false},
		{"framework + backend_infra → framework", ThemeBackendInfra, FormatFramework, VoiceFramework, false},
		{"framework + ai → framework", ThemeAI, FormatFramework, VoiceFramework, false},
		{"essay + personal_dev → essay", ThemePersonalDev, FormatEssay, VoiceEssay, false},
		{"essay + content_creation → essay", ThemeContentCreation, FormatEssay, VoiceEssay, false},
		{"deep_dive + personal_dev → error", ThemePersonalDev, FormatDeepDive, "", true},
		{"essay + backend_infra → error", ThemeBackendInfra, FormatEssay, "", true},
		{"framework + personal_dev → error", ThemePersonalDev, FormatFramework, "", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := SelectVoice(tt.themeArea, tt.format)
			if (err != nil) != tt.wantErr {
				t.Errorf("SelectVoice() error = %v, wantErr = %v", err, tt.wantErr)
				return
			}
			if got != tt.wantVoice {
				t.Errorf("SelectVoice() = %v, want %v", got, tt.wantVoice)
			}
		})
	}
}
