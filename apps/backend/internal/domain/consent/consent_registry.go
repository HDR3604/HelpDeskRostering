package consent

// ConsentVersion is the current active consent version shown to students.
// When updating consent text, add a new entry to ConsentTexts and bump this constant.
const ConsentVersion = "v1.0"

// ConsentTexts maps version identifiers to the full consent text that was displayed.
// Old entries must NEVER be removed or edited — they serve as an audit trail
// so any historical record can be traced back to the exact text the student agreed to.
var ConsentTexts = map[string]string{
	"v1.0": "In accordance with the Data Protection Act 2011 (Sections 6(b) and 6(c)), " +
		"I hereby consent to HelpDesk Rostering collecting, processing, and storing my " +
		"banking information solely for the purpose of payroll disbursement. My data will " +
		"be handled securely and will not be shared with third parties without my explicit " +
		"consent, except as required by law. I understand that I may withdraw this consent " +
		"at any time by contacting the administrator, and that withdrawal of consent does " +
		"not affect the lawfulness of processing based on consent before its withdrawal.",
}
