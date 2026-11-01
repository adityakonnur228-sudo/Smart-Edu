package edu.smartstudy.tutor;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "tutor_messages")
public class TutorMessage {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "conversation_id", nullable = false)
    private Long conversationId;

    @Column(nullable = false, length = 12)
    private String role;

    @Column(nullable = false, columnDefinition = "MEDIUMTEXT")
    private String content;

    @Column(name = "sources_json", columnDefinition = "MEDIUMTEXT")
    private String sourcesJson;

    @Column(name = "attachments_json", columnDefinition = "TEXT")
    private String attachmentsJson;

    @Column(name = "created_at", insertable = false, updatable = false)
    private Instant createdAt;

    protected TutorMessage() {}

    public TutorMessage(Long conversation, String role, String content, String sources) {
        this(conversation, role, content, sources, null);
    }

    public TutorMessage(Long conversation, String role, String content, String sources, String attachments) {
        this.conversationId = conversation;
        this.role = role;
        this.content = content;
        this.sourcesJson = sources;
        this.attachmentsJson = attachments;
    }

    public Long getId() { return id; }
    public Long getConversationId() { return conversationId; }
    public String getRole() { return role; }
    public String getContent() { return content; }
    public String getSourcesJson() { return sourcesJson; }
    public String getAttachmentsJson() { return attachmentsJson; }
    public Instant getCreatedAt() { return createdAt; }
}
