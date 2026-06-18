# NarrateMM Backend API Contract

**Version:** 1.0.0  
**Frontend Ready:** ✅ React + TypeScript  
**Last Updated:** December 2024

This document specifies **every endpoint** the Spring Boot backend must implement. The React frontend is already configured to call these endpoints.

---

## 📋 Table of Contents

1. [Base Configuration](#base-configuration)
2. [Authentication Endpoints](#1-authentication-endpoints)
3. [Project Endpoints](#2-project-endpoints)
4. [Upload Endpoints](#3-upload-endpoints)
5. [Transcript Endpoints](#4-transcript-endpoints)
6. [Script Endpoints](#5-script-endpoints)
7. [Voice-over Endpoints](#6-voice-over-endpoints)
8. [Export Endpoints](#7-export-endpoints)
9. [WebSocket Real-time Updates](#8-websocket-real-time-updates)
10. [Data Models / DTOs](#9-data-models--dtos)
11. [Error Responses](#10-error-responses)
12. [Java Entity Classes](#11-java-entity-classes)

---

## Base Configuration

```yaml
Base URL: http://localhost:8080/api
WebSocket URL: ws://localhost:8080/ws
Content-Type: application/json
Authentication: Bearer JWT Token

Headers (Required for all except auth):
  Authorization: Bearer {jwt_token}
  Content-Type: application/json
```

**CORS Configuration Required:**
```java
@CrossOrigin(origins = {"http://localhost:5173", "https://your-frontend.vercel.app"})
```

---

## 1. Authentication Endpoints

### 1.1 Register User

```http
POST /api/auth/register
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "name": "Aung Myat"
}
```

**Response 200 OK:**
```json
{
  "user": {
    "id": "uuid-here",
    "email": "user@example.com",
    "name": "Aung Myat",
    "avatar": "https://...",
    "provider": "email",
    "role": "USER",
    "createdAt": "2024-12-01T10:00:00Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 86400
}
```

**Response 400 Bad Request:**
```json
{
  "error": "EMAIL_ALREADY_EXISTS",
  "message": "Email is already registered"
}
```

---

### 1.2 Login (Email/Password)

```http
POST /api/auth/login
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response 200 OK:**
```json
{
  "user": {
    "id": "uuid-here",
    "email": "user@example.com",
    "name": "Aung Myat",
    "avatar": "https://...",
    "provider": "email",
    "role": "USER"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 86400
}
```

**Response 401 Unauthorized:**
```json
{
  "error": "INVALID_CREDENTIALS",
  "message": "Invalid email or password"
}
```

---

### 1.3 OAuth Login (Google / Facebook)

```http
POST /api/auth/oauth
```

**Request Body:**
```json
{
  "provider": "google",
  "idToken": "google-id-token-from-frontend-sdk"
}
```

**Notes for Backend:**
- Verify the `idToken` with Google/Facebook SDK on backend
- Extract user info from token
- Create user if doesn't exist
- Return same response as login

**Response 200 OK:** (Same as login)

---

### 1.4 Get Current User

```http
GET /api/auth/me
```

**Headers:** `Authorization: Bearer {token}`

**Response 200 OK:**
```json
{
  "id": "uuid-here",
  "email": "user@example.com",
  "name": "Aung Myat",
  "avatar": "https://...",
  "provider": "google",
  "role": "USER",
  "createdAt": "2024-12-01T10:00:00Z"
}
```

---

### 1.5 Forgot Password

```http
POST /api/auth/forgot-password
```

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response 200 OK:**
```json
{
  "message": "Password reset email sent"
}
```

---

### 1.6 Reset Password

```http
POST /api/auth/reset-password
```

**Request Body:**
```json
{
  "token": "reset-token-from-email",
  "newPassword": "newSecurePassword123"
}
```

**Response 200 OK:**
```json
{
  "message": "Password updated successfully"
}
```

---

## 2. Project Endpoints

### 2.1 Create Project

```http
POST /api/projects
```

**Headers:** `Authorization: Bearer {token}`

**Request Body:**
```json
{
  "title": "Drama Title - Episode 15 Recap",
  "aspectRatio": "9:16"
}
```

**Response 201 Created:**
```json
{
  "id": "project-uuid",
  "userId": "user-uuid",
  "title": "Drama Title - Episode 15 Recap",
  "status": "draft",
  "aspectRatio": "9:16",
  "thumbnail": null,
  "videoPath": null,
  "youtubeUrl": null,
  "durationSeconds": null,
  "createdAt": "2024-12-01T10:00:00Z",
  "updatedAt": "2024-12-01T10:00:00Z"
}
```

---

### 2.2 Get All Projects (Current User)

```http
GET /api/projects
```

**Headers:** `Authorization: Bearer {token}`

**Response 200 OK:**
```json
[
  {
    "id": "project-1",
    "userId": "user-uuid",
    "title": "Drama Title Episode 15",
    "status": "done",
    "thumbnail": "https://cloudinary.com/...",
    "aspectRatio": "9:16",
    "createdAt": "2024-12-01T10:00:00Z",
    "updatedAt": "2024-12-01T10:30:00Z"
  }
]
```

---

### 2.3 Get Single Project

```http
GET /api/projects/{id}
```

**Headers:** `Authorization: Bearer {token}`

**Response 200 OK:** (Same as create response)

**Response 404 Not Found:**
```json
{
  "error": "PROJECT_NOT_FOUND",
  "message": "Project not found or you don't have access"
}
```

---

### 2.4 Update Project

```http
PUT /api/projects/{id}
```

**Headers:** `Authorization: Bearer {token}`

**Request Body (all fields optional):**
```json
{
  "title": "Updated Title",
  "status": "done",
  "aspectRatio": "16:9"
}
```

**Response 200 OK:** (Updated project)

---

### 2.5 Delete Project

```http
DELETE /api/projects/{id}
```

**Headers:** `Authorization: Bearer {token}`

**Response 204 No Content**

**Backend must also delete:**
- Video file from storage
- Audio file
- Output video file
- Thumbnail
- Related transcript, script, voiceover, export records

---

## 3. Upload Endpoints

### 3.1 Upload Video File

```http
POST /api/upload/file
Content-Type: multipart/form-data
```

**Headers:** `Authorization: Bearer {token}`

**Form Data:**
```
file: [Binary MP4/MOV/AVI file - max 500MB]
projectId: "project-uuid"
```

**Response 200 OK:**
```json
{
  "projectId": "project-uuid",
  "videoPath": "/storage/videos/project-uuid/source.mp4",
  "fileName": "drama-episode-15.mp4",
  "fileSize": 157286400,
  "durationSeconds": 2700,
  "message": "File uploaded successfully"
}
```

**Backend Implementation Notes:**
- Save to: `C:/Users/zarnn/Recap_Videos/project/{projectId}/source.{ext}`
- Update project status to `draft`
- Extract duration using FFprobe
- Validate file size < 500MB
- Validate mime type (video/mp4, video/quicktime, etc.)

---

### 3.2 Submit YouTube URL

```http
POST /api/upload/youtube
```

**Headers:** `Authorization: Bearer {token}`

**Request Body:**
```json
{
  "projectId": "project-uuid",
  "youtubeUrl": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
}
```

**Response 200 OK:**
```json
{
  "projectId": "project-uuid",
  "videoPath": null,
  "fileName": null,
  "fileSize": null,
  "durationSeconds": 1800,
  "message": "YouTube URL registered. Use Supadata API to fetch captions."
}
```

**Backend should:**
- Validate YouTube URL format
- Extract video ID
- Store URL in project
- Optionally fetch metadata (title, duration)

---

### 3.3 Upload Logo (Watermark)

```http
POST /api/upload/logo/{projectId}
Content-Type: multipart/form-data
```

**Headers:** `Authorization: Bearer {token}`

**Form Data:**
```
logo: [Binary PNG file - max 5MB, transparent background recommended]
```

**Response 200 OK:**
```json
{
  "logoPath": "/storage/logos/project-uuid/logo.png"
}
```

---

## 4. Transcript Endpoints

### 4.1 Start Transcription

```http
POST /api/transcript/transcribe/{projectId}
```

**Headers:** `Authorization: Bearer {token}`

**Response 202 Accepted:**
```json
{
  "transcript": {
    "id": "transcript-uuid",
    "projectId": "project-uuid",
    "rawText": "...",
    "srtContent": "1\n00:00:00,000 --> ...",
    "language": "myanmar",
    "source": "groq",
    "durationSeconds": 2700,
    "createdAt": "2024-12-01T10:05:00Z"
  },
  "message": "Transcription started"
}
```

**Backend Logic:**
```
If project.youtubeUrl is set:
    Use Supadata API to fetch captions
    Fallback to Groq Whisper if no captions
    
If project.videoPath is set:
    Use Groq Whisper API to transcribe audio
    Extract audio: ffmpeg -i video.mp4 -ar 16000 audio.wav
    Send to Groq Whisper
    Get SRT format
```

**Update project status to `transcribing` then `done` when complete**

---

### 4.2 Get Transcript

```http
GET /api/transcript/{projectId}
```

**Headers:** `Authorization: Bearer {token}`

**Response 200 OK:**
```json
{
  "id": "transcript-uuid",
  "projectId": "project-uuid",
  "rawText": "Full text of the transcript...",
  "srtContent": "1\n00:00:00,000 --> 00:00:05,000\nText here\n\n2\n...",
  "language": "myanmar",
  "source": "groq",
  "durationSeconds": 2700,
  "createdAt": "2024-12-01T10:05:00Z"
}
```

---

### 4.3 Update Transcript (Manual Edit)

```http
PUT /api/transcript/{projectId}
```

**Headers:** `Authorization: Bearer {token}`

**Request Body:**
```json
{
  "rawText": "Edited transcript text...",
  "srtContent": "1\n00:00:00,000 --> 00:00:05,000\nEdited text\n..."
}
```

**Response 200 OK:** (Updated transcript)

---

## 5. Script Endpoints

### 5.1 Generate Script

```http
POST /api/script/generate/{projectId}
```

**Headers:** `Authorization: Bearer {token}`

**Request Body:**
```json
{
  "style": "dramatic",
  "language": "myanmar"
}
```

**Valid `style` values:** `dramatic` | `casual` | `spoiler` | `hype`  
**Valid `language` values:** `myanmar` | `english` | `both`

**Response 200 OK:**
```json
{
  "id": "script-uuid",
  "projectId": "project-uuid",
  "content": "🎬 ဒီအပိုင်းမှာ...\n\n💔 သူမရဲ့...",
  "style": "dramatic",
  "language": "myanmar",
  "segments": [
    {
      "id": "seg-1",
      "startTime": 0,
      "endTime": 5,
      "text": "ဒီအပိုင်းမှာ မင်းသမီးက..."
    }
  ],
  "geminiModel": "gemini-2.5-flash",
  "createdAt": "2024-12-01T10:10:00Z",
  "updatedAt": "2024-12-01T10:10:00Z"
}
```

**Backend Gemini Prompt Template:**
```java
String prompt = """
    You are a professional Myanmar drama recap script writer.
    
    Style: {style} (dramatic/casual/spoiler/hype)
    Language: {language} (myanmar/english/both)
    
    Original Transcript:
    {transcript}
    
    Write an engaging recap script in 300-500 words.
    Use emojis and dramatic language.
    Match the timestamps from the original SRT.
    """;
```

---

### 5.2 Get Script

```http
GET /api/script/{projectId}
```

**Response 200 OK:** (Same as generate response)

---

### 5.3 Update Script (Manual Edit)

```http
PUT /api/script/{projectId}
```

**Request Body:**
```json
{
  "content": "Manually edited script content...",
  "segments": [
    {
      "id": "seg-1",
      "startTime": 0,
      "endTime": 5,
      "text": "Updated segment text"
    }
  ]
}
```

**Response 200 OK:** (Updated script)

---

### 5.4 Update Single Script Segment

```http
PUT /api/script/segment/{segmentId}
```

**Request Body:**
```json
{
  "text": "New text for this segment"
}
```

**Response 200 OK:**
```json
{
  "id": "seg-1",
  "startTime": 0,
  "endTime": 5,
  "text": "New text for this segment"
}
```

---

## 6. Voice-over Endpoints

### 6.1 Generate Voice-over

```http
POST /api/voice/generate/{projectId}
```

**Headers:** `Authorization: Bearer {token}`

**Request Body:**
```json
{
  "voiceName": "Aoede",
  "stylePrompt": "Speak in a warm, engaging tone suitable for drama storytelling",
  "speed": 1.0
}
```

**Valid `voiceName` values:** `Aoede` | `Puck` | `Charon` | `Kore`  
**Valid `speed` range:** 0.5 - 2.0

**Response 200 OK:**
```json
{
  "id": "voiceover-uuid",
  "projectId": "project-uuid",
  "audioPath": "/storage/audio/project-uuid/voiceover.mp3",
  "voiceName": "Aoede",
  "stylePrompt": "Speak in a warm, engaging tone...",
  "speed": 1.0,
  "durationSeconds": 45,
  "createdAt": "2024-12-01T10:15:00Z"
}
```

**Backend Implementation:**
```java
// Call Gemini 2.5 Flash TTS API
// Save audio file to: /storage/audio/{projectId}/voiceover.mp3
// Use FFprobe to get duration
// Update project status
```

---

### 6.2 Get Voice-over Info

```http
GET /api/voice/{projectId}
```

**Response 200 OK:** (Same as generate response)

---

### 6.3 Stream Audio File (for browser playback)

```http
GET /api/voice/audio/{projectId}
```

**Headers:** `Authorization: Bearer {token}`

**Response 200 OK:** (Binary audio stream)

**Headers:**
```
Content-Type: audio/mpeg
Content-Length: 450000
Accept-Ranges: bytes
```

**Backend:** Stream the MP3 file using `Resource` or `FileSystemResource`

```java
@GetMapping("/voice/audio/{projectId}")
public ResponseEntity<Resource> getAudio(@PathVariable String projectId) {
    File file = new File("/storage/audio/" + projectId + "/voiceover.mp3");
    return ResponseEntity.ok()
        .contentType(MediaType.parseMediaType("audio/mpeg"))
        .body(new FileSystemResource(file));
}
```

---

## 7. Export Endpoints

### 7.1 Start Export (Async)

```http
POST /api/export/start/{projectId}
```

**Headers:** `Authorization: Bearer {token}`

**Request Body:**
```json
{
  "settings": {
    "aspectRatio": "9:16",
    "logoPath": "/storage/logos/project-uuid/logo.png",
    "logoPosition": "bottom-right",
    "logoSize": 100,
    "logoOpacity": 80,
    "subtitleEnabled": true,
    "subtitleFont": "Noto Serif Myanmar",
    "subtitleSize": 24,
    "audioMix": 70
  }
}
```

**Valid `logoPosition` values:** 
`top-left` | `top-center` | `top-right` | 
`center-left` | `center` | `center-right` | 
`bottom-left` | `bottom-center` | `bottom-right`

**Valid `audioMix` range:** 0-100 (0 = all original, 100 = all voice-over)

**Response 202 Accepted (returns immediately):**
```json
{
  "id": "job-uuid",
  "projectId": "project-uuid",
  "status": "processing",
  "progress": 0,
  "startedAt": "2024-12-01T10:20:00Z"
}
```

**Backend Implementation:**
```java
@Async
public void runFFmpegJob(String jobId, ExportSettings settings) {
    // 1. Build FFmpeg command
    // 2. Parse stderr for progress
    // 3. Push progress to WebSocket: /topic/progress/{jobId}
    // 4. Save output to: /storage/exports/{projectId}/final.mp4
    // 5. Update job status to 'done' or 'failed'
}
```

**FFmpeg Command Example:**
```bash
ffmpeg -i source.mp4 \
  -i voiceover.mp3 \
  -i logo.png \
  -filter_complex "[0:v]crop=ih*9/16:ih,scale=1080:1920[v]; \
                   [v]subtitles=script.srt:fontsdir=/usr/share/fonts/[s]; \
                   [s][2:v]overlay=W-w-20:H-h-20:format=auto[final]" \
  -map "[final]" -map "1:a" \
  -filter:a "volume=0.7" \
  -c:v libx264 -c:a aac \
  -shortest output.mp4
```

---

### 7.2 Get Export Status

```http
GET /api/export/status/{jobId}
```

**Headers:** `Authorization: Bearer {token}`

**Response 200 OK:**
```json
{
  "id": "job-uuid",
  "projectId": "project-uuid",
  "status": "processing",
  "progress": 45,
  "outputPath": null,
  "errorMessage": null,
  "startedAt": "2024-12-01T10:20:00Z",
  "completedAt": null
}
```

**When done:**
```json
{
  "id": "job-uuid",
  "projectId": "project-uuid",
  "status": "done",
  "progress": 100,
  "outputPath": "/storage/exports/project-uuid/final.mp4",
  "errorMessage": null,
  "startedAt": "2024-12-01T10:20:00Z",
  "completedAt": "2024-12-01T10:25:00Z"
}
```

---

### 7.3 Download Exported Video

```http
GET /api/export/download/{jobId}
```

**Headers:** `Authorization: Bearer {token}`

**Response 200 OK:** (Binary MP4 stream)

**Headers:**
```
Content-Type: video/mp4
Content-Disposition: attachment; filename="recap.mp4"
```

---

### 7.4 Cancel Export

```http
DELETE /api/export/{jobId}
```

**Headers:** `Authorization: Bearer {token}`

**Response 204 No Content**

**Backend:** Kill the FFmpeg process and mark job as `failed`

---

## 8. WebSocket Real-time Updates

### Connection URL
```
ws://localhost:8080/ws
```

### Subscribe to Export Progress

```
SUBSCRIBE /topic/progress/{jobId}
```

**Message Format (pushed every 2 seconds):**
```json
{
  "jobId": "job-uuid",
  "projectId": "project-uuid",
  "status": "processing",
  "progress": 45,
  "timestamp": "2024-12-01T10:21:00Z"
}
```

**Spring Boot Implementation:**
```java
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {
    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        config.enableSimpleBroker("/topic");
        config.setApplicationDestinationPrefixes("/app");
    }
    
    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws").setAllowedOrigins("*").withSockJS();
    }
}
```

**Push progress from FFmpeg job:**
```java
@Autowired
private SimpMessagingTemplate messagingTemplate;

// In FFmpeg process handler:
messagingTemplate.convertAndSend(
    "/topic/progress/" + jobId, 
    new ProgressUpdate(jobId, status, progress)
);
```

---

## 9. Data Models / DTOs

### User DTO
```java
public class UserDTO {
    private String id;
    private String email;
    private String name;
    private String avatar;
    private String provider;  // "email" | "google" | "facebook"
    private String role;      // "USER" | "ADMIN"
    private String createdAt;
}
```

### Project DTO
```java
public class ProjectDTO {
    private String id;
    private String userId;
    private String title;
    private String status;  // draft|transcribing|scripting|voiceover|editing|exporting|done|failed
    private String thumbnail;
    private String videoPath;
    private String youtubeUrl;
    private String aspectRatio;  // "9:16" | "16:9" | "4:5" | "1:1"
    private Integer durationSeconds;
    private String createdAt;
    private String updatedAt;
}
```

### Transcript DTO
```java
public class TranscriptDTO {
    private String id;
    private String projectId;
    private String rawText;
    private String srtContent;
    private String language;
    private String source;  // "groq" | "supadata"
    private Integer durationSeconds;
    private String createdAt;
}
```

### Script DTO
```java
public class ScriptDTO {
    private String id;
    private String projectId;
    private String content;
    private String style;      // dramatic|casual|spoiler|hype
    private String language;   // myanmar|english|both
    private List<ScriptSegmentDTO> segments;
    private String geminiModel;
    private String createdAt;
    private String updatedAt;
}

public class ScriptSegmentDTO {
    private String id;
    private Double startTime;  // seconds
    private Double endTime;    // seconds
    private String text;
}
```

### VoiceOver DTO
```java
public class VoiceOverDTO {
    private String id;
    private String projectId;
    private String audioPath;
    private String voiceName;   // Aoede|Puck|Charon|Kore
    private String stylePrompt;
    private Double speed;
    private Integer durationSeconds;
    private String createdAt;
}
```

### Export DTO
```java
public class ExportSettingsDTO {
    private String aspectRatio;
    private String logoPath;
    private String logoPosition;
    private Integer logoSize;       // 50-200
    private Integer logoOpacity;    // 20-100
    private Boolean subtitleEnabled;
    private String subtitleFont;
    private Integer subtitleSize;   // 16-48
    private Integer audioMix;       // 0-100
}

public class ExportJobDTO {
    private String id;
    private String projectId;
    private String status;          // queued|processing|done|failed
    private Integer progress;       // 0-100
    private String outputPath;
    private String errorMessage;
    private String startedAt;
    private String completedAt;
}
```

### Auth DTOs
```java
public class RegisterRequest {
    @NotBlank @Email
    private String email;
    @NotBlank @Size(min = 8)
    private String password;
    @NotBlank
    private String name;
}

public class LoginRequest {
    @NotBlank @Email
    private String email;
    @NotBlank
    private String password;
}

public class OAuthLoginRequest {
    @NotBlank
    private String provider;  // "google" | "facebook"
    @NotBlank
    private String idToken;
}

public class AuthResponse {
    private UserDTO user;
    private String token;
    private Long expiresIn;  // seconds
}
```

---

## 10. Error Responses

**Standard Error Format:**
```json
{
  "error": "ERROR_CODE",
  "message": "Human readable error message",
  "timestamp": "2024-12-01T10:00:00Z",
  "path": "/api/projects/123"
}
```

**Common Error Codes:**

| HTTP Status | Error Code | Description |
|-------------|-----------|-------------|
| 400 | `VALIDATION_ERROR` | Request body validation failed |
| 400 | `INVALID_INPUT` | Invalid parameter value |
| 401 | `UNAUTHORIZED` | Missing or invalid JWT token |
| 401 | `INVALID_CREDENTIALS` | Wrong email/password |
| 401 | `TOKEN_EXPIRED` | JWT token expired |
| 403 | `FORBIDDEN` | User doesn't have access to resource |
| 404 | `NOT_FOUND` | Resource not found |
| 404 | `PROJECT_NOT_FOUND` | Project not found |
| 409 | `EMAIL_ALREADY_EXISTS` | Email already registered |
| 413 | `FILE_TOO_LARGE` | File exceeds 500MB |
| 415 | `UNSUPPORTED_MEDIA_TYPE` | Invalid file format |
| 429 | `RATE_LIMIT_EXCEEDED` | Too many requests |
| 500 | `INTERNAL_SERVER_ERROR` | Server error |
| 500 | `FFMPEG_ERROR` | Video processing failed |
| 502 | `EXTERNAL_API_ERROR` | Gemini/Groq/Supadata API failed |
| 503 | `SERVICE_UNAVAILABLE` | Service temporarily down |

---

## 11. Java Entity Classes

### User Entity
```java
@Entity
@Table(name = "users")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;
    
    @Column(unique = true, nullable = false)
    private String email;
    
    @Column(nullable = false)
    private String name;
    
    @Column(nullable = false)
    private String password;  // BCrypt hashed
    
    private String avatar;
    
    @Enumerated(EnumType.STRING)
    private Provider provider;  // EMAIL, GOOGLE, FACEBOOK
    
    @Enumerated(EnumType.STRING)
    private Role role = Role.USER;  // USER, ADMIN
    
    private Boolean enabled = true;
    
    @CreationTimestamp
    private LocalDateTime createdAt;
    
    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
```

### Project Entity
```java
@Entity
@Table(name = "projects")
@Data
public class Project {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
    
    @Column(nullable = false)
    private String title;
    
    @Enumerated(EnumType.STRING)
    private ProjectStatus status = ProjectStatus.DRAFT;
    
    private String thumbnail;
    private String videoPath;
    private String youtubeUrl;
    
    @Enumerated(EnumType.STRING)
    private AspectRatio aspectRatio = AspectRatio.NINE_SIXTEEN;
    
    private Integer durationSeconds;
    
    @CreationTimestamp
    private LocalDateTime createdAt;
    
    @UpdateTimestamp
    private LocalDateTime updatedAt;
    
    @OneToOne(mappedBy = "project", cascade = CascadeType.ALL)
    private Transcript transcript;
    
    @OneToOne(mappedBy = "project", cascade = CascadeType.ALL)
    private Script script;
    
    @OneToOne(mappedBy = "project", cascade = CascadeType.ALL)
    private VoiceOver voiceOver;
    
    @OneToMany(mappedBy = "project", cascade = CascadeType.ALL)
    private List<ExportJob> exports;
}

public enum ProjectStatus {
    DRAFT, TRANSCRIBING, SCRIPTING, VOICEOVER, 
    EDITING, EXPORTING, DONE, FAILED
}

public enum AspectRatio {
    NINE_SIXTEEN, SIXTEEN_NINE, FOUR_FIVE, ONE_ONE
}
```

### Transcript Entity
```java
@Entity
@Table(name = "transcripts")
@Data
public class Transcript {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;
    
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;
    
    @Lob
    @Column(columnDefinition = "TEXT")
    private String rawText;
    
    @Lob
    @Column(columnDefinition = "TEXT")
    private String srtContent;
    
    private String language;
    
    @Enumerated(EnumType.STRING)
    private TranscriptSource source;  // GROQ, SUPADATA
    
    private Integer durationSeconds;
    
    @CreationTimestamp
    private LocalDateTime createdAt;
}
```

### Script Entity
```java
@Entity
@Table(name = "scripts")
@Data
public class Script {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;
    
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;
    
    @Lob
    @Column(columnDefinition = "TEXT")
    private String content;
    
    @Enumerated(EnumType.STRING)
    private ScriptStyle style;
    
    @Enumerated(EnumType.STRING)
    private ScriptLanguage language;
    
    private String geminiModel;
    
    @OneToMany(mappedBy = "script", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ScriptSegment> segments = new ArrayList<>();
    
    @CreationTimestamp
    private LocalDateTime createdAt;
    
    @UpdateTimestamp
    private LocalDateTime updatedAt;
}

@Entity
@Table(name = "script_segments")
@Data
public class ScriptSegment {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "script_id", nullable = false)
    private Script script;
    
    private Double startTime;
    private Double endTime;
    
    @Lob
    @Column(columnDefinition = "TEXT")
    private String text;
}
```

### VoiceOver Entity
```java
@Entity
@Table(name = "voiceovers")
@Data
public class VoiceOver {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;
    
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;
    
    private String audioPath;
    
    @Enumerated(EnumType.STRING)
    private VoiceName voiceName;
    
    @Lob
    @Column(columnDefinition = "TEXT")
    private String stylePrompt;
    
    private Double speed;
    private Integer durationSeconds;
    
    @CreationTimestamp
    private LocalDateTime createdAt;
}

public enum VoiceName { Aoede, Puck, Charon, Kore }
```

### Export Entity
```java
@Entity
@Table(name = "exports")
@Data
public class ExportJob {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;
    
    @Enumerated(EnumType.STRING)
    private ExportStatus status = ExportStatus.QUEUED;
    
    private Integer progress = 0;
    private String outputPath;
    private String errorMessage;
    
    // Settings stored as JSON or separate columns
    @Enumerated(EnumType.STRING)
    private AspectRatio aspectRatio;
    private String logoPath;
    
    @Enumerated(EnumType.STRING)
    private LogoPosition logoPosition;
    
    private Integer logoSize;
    private Integer logoOpacity;
    private Boolean subtitleEnabled;
    private String subtitleFont;
    private Integer subtitleSize;
    private Integer audioMix;
    
    @CreationTimestamp
    private LocalDateTime startedAt;
    
    private LocalDateTime completedAt;
}

public enum ExportStatus { QUEUED, PROCESSING, DONE, FAILED }
```

---

## 12. Frontend Service Files (Already Created)

The React frontend already has these service files ready:

| File | Purpose |
|------|---------|
| `src/services/api.ts` | Axios instance with JWT interceptor |
| `src/services/authService.ts` | All auth API calls |
| `src/services/projectService.ts` | Project CRUD |
| `src/services/uploadService.ts` | File uploads with progress |
| `src/services/transcriptService.ts` | Transcription API |
| `src/services/scriptService.ts` | Script generation |
| `src/services/voiceService.ts` | Voice-over TTS |
| `src/services/exportService.ts` | Export & WebSocket |

**Environment Variable Setup:**
```env
# .env (Vite)
VITE_API_URL=http://localhost:8080/api
```

---

## 13. Quick Start Checklist for Backend

- [ ] Create all entity classes (above)
- [ ] Create DTOs matching the API contract
- [ ] Set up JWT authentication (jjwt 0.12.5)
- [ ] Configure CORS for `http://localhost:5173`
- [ ] Implement file upload with progress
- [ ] Integrate Gemini API for script + TTS
- [ ] Integrate Groq Whisper for transcription
- [ ] Integrate Supadata for YouTube captions
- [ ] Set up FFmpeg with Noto Myanmar font
- [ ] Configure WebSocket with STOMP
- [ ] Create async job queue (@Async)
- [ ] Test all endpoints with the React frontend
- [ ] Set up H2 database (or PostgreSQL)

---

## 14. Testing the Integration

```bash
# Start Spring Boot
./mvnw spring-boot:run

# Start React (in separate terminal)
cd frontend
npm run dev

# Open browser
http://localhost:5173
```

The frontend will:
1. Use **demo mode** (no token) → mock data, full UI flow
2. Use **real API** (with token from login) → real backend calls

---

**🎉 The frontend is 100% ready. Implement the backend endpoints above and the integration will work seamlessly!**
