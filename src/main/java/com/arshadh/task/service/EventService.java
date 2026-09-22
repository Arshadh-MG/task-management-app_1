package com.arshadh.task.service;

import com.arshadh.task.dto.ApiResponse;
import com.arshadh.task.dto.EventRequest;
import com.arshadh.task.dto.EventResponseDto;
import com.arshadh.task.entity.Event;
import com.arshadh.task.entity.User;
import com.arshadh.task.entity.Product;
import com.arshadh.task.repository.EventRepository;
import com.arshadh.task.repository.ProductRepository;
import com.arshadh.task.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class EventService {

    private final EventRepository eventRepository;
    private final UserRepository userRepository;
    private final ProductRepository productRepository;

    public EventService(EventRepository eventRepository, UserRepository userRepository, ProductRepository productRepository) {
        this.eventRepository = eventRepository;
        this.userRepository = userRepository;
        this.productRepository = productRepository;
    }

    @Transactional(readOnly = true)
    public List<EventResponseDto> getAllEvents() {
        return eventRepository.findAllOrdered().stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    public ApiResponse saveEvent(EventRequest request) {
        User user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found."));

        User member = null;
        if (request.getMemberId() != null && request.getMemberId() > 0) {
            member = userRepository.findById(request.getMemberId()).orElse(null);
        }

        Product product = null;
        if (request.getProductId() != null && request.getProductId() > 0) {
            product = productRepository.findById(request.getProductId()).orElse(null);
        }

        String safeTitle = request.getTitle() != null && !request.getTitle().isBlank() 
                ? request.getTitle().trim() 
                : (request.getDescription() != null && !request.getDescription().isBlank() ? request.getDescription().trim() : "Update");

        // Duplicate check: prevent exact duplicate tickets for the same date and product
        Long currentEventId = request.getId();
        String newDate = request.getEventDate() != null ? request.getEventDate().trim() : "";
        Long newProdId = product != null ? product.getId() : null;
        String newDesc = (request.getDescription() != null ? request.getDescription().trim() : "");
        String incomingContent = !newDesc.isEmpty() ? newDesc : safeTitle;

        List<Event> dateEvents = eventRepository.findByEventDate(newDate);
        boolean isDuplicate = dateEvents.stream().anyMatch(e -> {
            if (currentEventId != null && currentEventId > 0 && e.getId().equals(currentEventId)) {
                return false;
            }
            Long existingProdId = e.getProduct() != null ? e.getProduct().getId() : null;
            if (newProdId != null || existingProdId != null) {
                if (newProdId == null || !newProdId.equals(existingProdId)) {
                    return false;
                }
            }

            String existingDesc = e.getDescription() != null ? e.getDescription().trim() : "";
            String existingTitle = e.getTitle() != null ? e.getTitle().trim() : "";
            String existingContent = !existingDesc.isEmpty() ? existingDesc : existingTitle;

            return existingContent.equals(incomingContent);
        });

        if (isDuplicate) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A duplicate ticket with the exact same content already exists for this date and product.");
        }

        if (request.getId() != null && request.getId() > 0) {
            Event existing = eventRepository.findById(request.getId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Event not found."));

            existing.setTitle(safeTitle);
            existing.setDescription(request.getDescription() != null ? request.getDescription().trim() : "");
            existing.setTokenId(request.getTokenId() != null ? request.getTokenId().trim() : null);
            existing.setSubject(request.getSubject() != null ? request.getSubject().trim() : null);
            existing.setComments(request.getComments() != null ? request.getComments().trim() : "");
            existing.setMember(member);
            existing.setProduct(product);
            String newStatus = request.getStatus() != null && !request.getStatus().isBlank() ? request.getStatus().trim() : "progress";
            existing.setStatus(newStatus);
            if ("completed".equalsIgnoreCase(newStatus)) {
                if (request.getEventDate() != null && !request.getEventDate().isBlank()) {
                    existing.setEventDate(request.getEventDate().trim());
                } else {
                    existing.setEventDate(LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd")));
                }
            } else {
                existing.setEventDate(request.getEventDate() != null && !request.getEventDate().isBlank() 
                        ? request.getEventDate().trim() 
                        : existing.getEventDate());
            }
            existing.setStartTime(request.getStartTime() != null ? request.getStartTime().trim() : "");
            existing.setEndTime(request.getEndTime() != null ? request.getEndTime().trim() : "");
            existing.setColor(request.getColor() != null && !request.getColor().isBlank() ? request.getColor().trim() : "blue");
            existing.setImages(request.getImages());

            Event saved = eventRepository.save(existing);
            return ApiResponse.success("Event updated successfully.", mapToDto(saved));
        } else {
            Event event = new Event();
            event.setUser(user);
            event.setTitle(safeTitle);
            event.setDescription(request.getDescription() != null ? request.getDescription().trim() : "");
            event.setTokenId(request.getTokenId() != null ? request.getTokenId().trim() : null);
            event.setSubject(request.getSubject() != null ? request.getSubject().trim() : null);
            event.setComments(request.getComments() != null ? request.getComments().trim() : "");
            event.setMember(member);
            event.setProduct(product);
            event.setStatus(request.getStatus() != null && !request.getStatus().isBlank() ? request.getStatus().trim() : "progress");
            event.setEventDate(request.getEventDate().trim());
            event.setStartTime(request.getStartTime() != null ? request.getStartTime().trim() : "");
            event.setEndTime(request.getEndTime() != null ? request.getEndTime().trim() : "");
            event.setColor(request.getColor() != null && !request.getColor().isBlank() ? request.getColor().trim() : "blue");
            event.setImages(request.getImages());

            Event saved = eventRepository.save(event);
            return ApiResponse.success("Event created successfully.", mapToDto(saved));
        }
    }

    public ApiResponse deleteEvent(Long id) {
        if (!eventRepository.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Event not found.");
        }
        eventRepository.deleteById(id);
        return ApiResponse.success("Event deleted successfully.");
    }

    public ApiResponse updateEventStatus(Long id, String status) {
        return updateEventStatus(id, status, null);
    }

    public ApiResponse updateEventStatus(Long id, String status, String date) {
        Event event = eventRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Event not found."));
        String trimmedStatus = status != null && !status.isBlank() ? status.trim() : "progress";
        event.setStatus(trimmedStatus);
        if ("completed".equalsIgnoreCase(trimmedStatus)) {
            if (date != null && !date.isBlank()) {
                event.setEventDate(date.trim());
            } else {
                event.setEventDate(LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd")));
            }
        }
        Event saved = eventRepository.saveAndFlush(event);
        return ApiResponse.success("Event status updated successfully.", mapToDto(saved));
    }

    private EventResponseDto mapToDto(Event event) {
        EventResponseDto dto = new EventResponseDto();
        dto.setId(event.getId());
        dto.setUserId(event.getUser() != null ? event.getUser().getId() : null);
        dto.setTitle(event.getTitle());
        dto.setDescription(event.getDescription());
        dto.setTokenId(event.getTokenId());
        dto.setSubject(event.getSubject());
        dto.setComments(event.getComments());
        dto.setMemberId(event.getMember() != null ? event.getMember().getId() : null);
        dto.setProductId(event.getProduct() != null ? event.getProduct().getId() : null);
        dto.setProductName(event.getProduct() != null ? event.getProduct().getName() : null);
        dto.setStatus(event.getStatus());
        dto.setEventDate(event.getEventDate());
        dto.setStartTime(event.getStartTime());
        dto.setEndTime(event.getEndTime());
        dto.setColor(event.getColor());
        dto.setImages(event.getImages());
        dto.setCreatedAt(event.getCreatedAt());
        dto.setUpdatedAt(event.getUpdatedAt());
        return dto;
    }
}
