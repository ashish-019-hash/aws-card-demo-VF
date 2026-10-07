package com.aws.carddemo.service;

import org.springframework.stereotype.Service;

@Service
public class AccessRules {
    public EntryPoint entryPointFor(String userType) {
        return "A".equalsIgnoreCase(userType) ? EntryPoint.ADMIN_MENU : EntryPoint.MAIN_MENU;
    }

    public boolean canAccess(String sessionUserType, String requiredUserType) {
        if ("A".equalsIgnoreCase(sessionUserType)) {
            return true;
        }
        return !"A".equalsIgnoreCase(requiredUserType);
    }

    public enum EntryPoint {
        ADMIN_MENU,
        MAIN_MENU
    }
}
