package edu.smartstudy.tutor;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "tutor_conversations")
public class TutorConversation {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "owner_id", nullable = false)
    private Long ownerId;

    @Column(nullable = false)
    private String title;

    @Column(name = "active_material_ids", length = 255)
    private String activeMaterialIds;

    @Column(name = "created_at", insertable = false, updatable = false)
    private Instant createdAt;

    protected TutorConversation() {}

    public TutorConversation(Long owner, String title) {
        this.ownerId = owner;
        this.title = title;
    }

    public Long getId() { return id; }
    public Long getOwnerId() { return ownerId; }
    public String getTitle() { return title; }
    public String getActiveMaterialIds() { return activeMaterialIds; }
    public void setActiveMaterialIds(String ids) { this.activeMaterialIds = ids; }
    public Instant getCreatedAt() { return createdAt; }
}
