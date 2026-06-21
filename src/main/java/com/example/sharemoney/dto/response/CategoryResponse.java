package com.example.sharemoney.dto.response;

import com.example.sharemoney.entity.TransactionType;
import lombok.Builder;
import lombok.Data;
import java.util.UUID;

@Data
@Builder
public class CategoryResponse {
    private UUID id;
    private String name;
    private TransactionType type;
    private String iconName;
}
