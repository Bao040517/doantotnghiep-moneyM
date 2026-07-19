package com.example.sharemoney;

import jakarta.annotation.PostConstruct;
import java.util.TimeZone;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableAsync
@EnableScheduling
public class SharemoneyApplication {

    @PostConstruct
    public void init() {
        // Initialization if needed
    }

    public static void main(String[] args) {
        // Set default TimeZone to GMT+7 before Spring context starts
        TimeZone.setDefault(TimeZone.getTimeZone("Asia/Ho_Chi_Minh"));
        SpringApplication.run(SharemoneyApplication.class, args);
    }
}
