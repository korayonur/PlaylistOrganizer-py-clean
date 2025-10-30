using System;
using System.ComponentModel.DataAnnotations;

namespace PlaylistOrganizerAvalonia.Domain.Entities
{
    /// <summary>
    /// Base entity with common properties
    /// </summary>
    public abstract class BaseEntity
    {
        [Key]
        public int Id { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Check if entity is persisted (has valid ID)
        /// </summary>
        public bool IsPersisted => Id > 0;

        /// <summary>
        /// Update the UpdatedAt timestamp
        /// </summary>
        public void Touch()
        {
            UpdatedAt = DateTime.UtcNow;
        }

        /// <summary>
        /// Check if two entities are equal by ID
        /// </summary>
        public override bool Equals(object obj)
        {
            if (obj is BaseEntity other)
            {
                return Id == other.Id && Id > 0;
            }
            return false;
        }

        public override int GetHashCode()
        {
            return Id.GetHashCode();
        }
    }
}
