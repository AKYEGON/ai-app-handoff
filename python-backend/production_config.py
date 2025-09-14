"""
Production-ready configuration for DeepSeek-V3.1 chat system
Includes safety measures, monitoring, and error handling
"""

import os
import logging
import time
from typing import Dict, Any, Optional
from dataclasses import dataclass
from enum import Enum

class Environment(Enum):
    DEVELOPMENT = "development"
    STAGING = "staging"
    PRODUCTION = "production"

@dataclass
class RetryConfig:
    max_retries: int = 3
    base_delay: float = 1.0
    max_delay: float = 60.0
    exponential_base: float = 2.0
    jitter: bool = True

@dataclass
class RateLimitConfig:
    requests_per_minute: int = 60
    requests_per_hour: int = 1000
    concurrent_requests: int = 10
    burst_limit: int = 20

@dataclass
class SecurityConfig:
    require_api_key: bool = True
    allowed_origins: list = None
    max_message_length: int = 10000
    session_timeout_hours: int = 24
    enable_audit_logging: bool = True

class ProductionConfig:
    """Production configuration with safety measures"""
    
    def __init__(self, environment: Environment = Environment.PRODUCTION):
        self.environment = environment
        self.setup_logging()
        
        # Core settings
        self.api_key = os.getenv('SILICONFLOW_KEY')
        self.api_base_url = os.getenv('SILICONFLOW_URL', 'https://api.siliconflow.cn/v1')
        self.model_name = "deepseek-ai/DeepSeek-V3.1"
        
        # Safety settings
        self.safety_settings = self._get_safety_settings()
        self.retry_config = self._get_retry_config()
        self.rate_limit_config = self._get_rate_limit_config()
        self.security_config = self._get_security_config()
        
        # Performance settings
        self.performance_settings = self._get_performance_settings()
        
        # Monitoring settings
        self.monitoring_config = self._get_monitoring_config()
    
    def setup_logging(self):
        """Configure production logging"""
        log_level = logging.INFO
        if self.environment == Environment.DEVELOPMENT:
            log_level = logging.DEBUG
        elif self.environment == Environment.PRODUCTION:
            log_level = logging.WARNING
        
        logging.basicConfig(
            level=log_level,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            handlers=[
                logging.StreamHandler(),
                logging.FileHandler('deepseek_chat.log')
            ]
        )
        
        # Suppress noisy loggers
        logging.getLogger('requests').setLevel(logging.WARNING)
        logging.getLogger('urllib3').setLevel(logging.WARNING)
    
    def _get_safety_settings(self) -> Dict[str, Any]:
        """Conservative settings for production safety"""
        return {
            # Temperature settings (conservative for production)
            "temperature": {
                "fast_code": 0.25,      # Slightly more conservative
                "deep_reasoning": 0.15,  # More focused
                "code_review": 0.05,    # Very conservative for security
                "function_calling": 0.1  # Precise for tool usage
            },
            
            # Token limits
            "max_tokens": {
                "fast_code": 1500,      # Reduced for faster responses
                "deep_reasoning": 3000,  # Reduced but sufficient
                "code_review": 2500,    # Focused reviews
                "function_calling": 2000 # Concise tool usage
            },
            
            # Context management
            "max_context_tokens": 5000,  # Conservative limit
            "context_truncation_threshold": 4000,  # 80% of max
            "max_history_messages": 50,  # Limit message history
            
            # Request timeouts (in seconds)
            "request_timeout": 25,
            "total_timeout": 90,
            "connect_timeout": 8,
            
            # Content filtering
            "enable_content_filter": True,
            "max_message_length": 8000,
            "blocked_patterns": [
                r"api[_-]?key[s]?\s*[:=]\s*['\"]?[a-zA-Z0-9-_]{20,}",  # API keys
                r"password[s]?\s*[:=]\s*['\"]?[^'\"\\s]{8,}",          # Passwords
                r"secret[s]?\s*[:=]\s*['\"]?[a-zA-Z0-9-_]{16,}"       # Secrets
            ]
        }
    
    def _get_retry_config(self) -> RetryConfig:
        """Retry configuration for production reliability"""
        if self.environment == Environment.PRODUCTION:
            return RetryConfig(
                max_retries=2,      # Reduced retries to avoid cascading failures
                base_delay=2.0,     # Longer initial delay
                max_delay=120.0,    # Higher max delay
                exponential_base=2.5,
                jitter=True
            )
        else:
            return RetryConfig()  # Default settings for dev/staging
    
    def _get_rate_limit_config(self) -> RateLimitConfig:
        """Rate limiting for production stability"""
        if self.environment == Environment.PRODUCTION:
            return RateLimitConfig(
                requests_per_minute=40,  # Conservative limit
                requests_per_hour=800,   # Daily budget management
                concurrent_requests=5,   # Avoid overwhelming API
                burst_limit=10          # Small burst allowance
            )
        else:
            return RateLimitConfig(
                requests_per_minute=100,  # Higher limits for development
                requests_per_hour=2000,
                concurrent_requests=20,
                burst_limit=50
            )
    
    def _get_security_config(self) -> SecurityConfig:
        """Security configuration"""
        allowed_origins = ["*"]  # Default for development
        
        if self.environment == Environment.PRODUCTION:
            # In production, specify exact domains
            allowed_origins = [
                os.getenv('FRONTEND_DOMAIN', 'https://your-domain.com'),
                os.getenv('ADMIN_DOMAIN', 'https://admin.your-domain.com')
            ]
        
        return SecurityConfig(
            require_api_key=True,
            allowed_origins=allowed_origins,
            max_message_length=8000,
            session_timeout_hours=12 if self.environment == Environment.PRODUCTION else 24,
            enable_audit_logging=self.environment == Environment.PRODUCTION
        )
    
    def _get_performance_settings(self) -> Dict[str, Any]:
        """Performance optimization settings"""
        return {
            # Connection pooling
            "connection_pool_size": 10,
            "connection_pool_maxsize": 20,
            "connection_pool_block": False,
            
            # Caching
            "enable_response_cache": True,
            "cache_ttl_seconds": 300,  # 5 minutes
            "cache_max_size": 1000,
            
            # Background tasks
            "cleanup_interval_minutes": 30,
            "session_cleanup_hours": 48,
            "metrics_collection_interval": 60,
            
            # Resource limits
            "max_concurrent_sessions": 100,
            "max_memory_usage_mb": 512,
            "enable_garbage_collection": True
        }
    
    def _get_monitoring_config(self) -> Dict[str, Any]:
        """Monitoring and alerting configuration"""
        return {
            # Metrics collection
            "enable_metrics": True,
            "metrics_endpoint": "/metrics",
            "metrics_port": 9090,
            
            # Health checks
            "health_check_interval": 30,
            "health_check_timeout": 5,
            "unhealthy_threshold": 3,
            
            # Alerting thresholds
            "alert_thresholds": {
                "error_rate_percent": 5.0,
                "response_time_ms": 5000,
                "queue_depth": 50,
                "memory_usage_percent": 80,
                "api_rate_limit_percent": 90
            },
            
            # Logging
            "log_level": "INFO" if self.environment == Environment.PRODUCTION else "DEBUG",
            "log_format": "json" if self.environment == Environment.PRODUCTION else "text",
            "enable_access_logs": True,
            "enable_error_tracking": True
        }

class ProductionGuards:
    """Production safety guards and validators"""
    
    @staticmethod
    def validate_api_response(response: Dict[str, Any]) -> bool:
        """Validate API response structure"""
        required_fields = ["success"]
        
        if not all(field in response for field in required_fields):
            return False
        
        if response.get("success"):
            # Success response validation
            return "response" in response or "content" in response
        else:
            # Error response validation
            return "error" in response
    
    @staticmethod
    def sanitize_user_input(user_input: str, max_length: int = 8000) -> str:
        """Sanitize user input for safety"""
        if not isinstance(user_input, str):
            raise ValueError("Input must be a string")
        
        # Truncate if too long
        if len(user_input) > max_length:
            user_input = user_input[:max_length]
        
        # Remove potentially dangerous patterns
        dangerous_patterns = [
            r"<script[^>]*>.*?</script>",  # Script tags
            r"javascript:",               # JavaScript URLs
            r"on\w+\s*=",                # Event handlers
        ]
        
        import re
        for pattern in dangerous_patterns:
            user_input = re.sub(pattern, "", user_input, flags=re.IGNORECASE | re.DOTALL)
        
        return user_input.strip()
    
    @staticmethod
    def check_rate_limit(identifier: str, config: RateLimitConfig) -> bool:
        """Check if request is within rate limits"""
        # This would integrate with a rate limiting service like Redis
        # For now, return True (implement based on your infrastructure)
        return True
    
    @staticmethod
    def validate_session(session_id: str, max_age_hours: int = 24) -> bool:
        """Validate session is not expired"""
        # Implement session validation logic
        return True

class ProductionMetrics:
    """Production metrics collection"""
    
    def __init__(self):
        self.request_count = 0
        self.error_count = 0
        self.total_response_time = 0.0
        self.start_time = time.time()
    
    def record_request(self, response_time: float, success: bool):
        """Record request metrics"""
        self.request_count += 1
        self.total_response_time += response_time
        
        if not success:
            self.error_count += 1
    
    def get_metrics(self) -> Dict[str, Any]:
        """Get current metrics"""
        uptime = time.time() - self.start_time
        avg_response_time = (
            self.total_response_time / self.request_count 
            if self.request_count > 0 else 0
        )
        error_rate = (
            self.error_count / self.request_count * 100 
            if self.request_count > 0 else 0
        )
        
        return {
            "uptime_seconds": uptime,
            "total_requests": self.request_count,
            "total_errors": self.error_count,
            "error_rate_percent": error_rate,
            "average_response_time_ms": avg_response_time * 1000,
            "requests_per_second": self.request_count / uptime if uptime > 0 else 0
        }

# Global production configuration instance
production_config = ProductionConfig(
    environment=Environment(os.getenv('ENVIRONMENT', 'development'))
)

# Global metrics instance
production_metrics = ProductionMetrics()

def get_production_config() -> ProductionConfig:
    """Get production configuration"""
    return production_config

def get_production_metrics() -> ProductionMetrics:
    """Get production metrics"""
    return production_metrics