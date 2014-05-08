<?php

namespace Ibrows\SmartAjaxBundle\DependencyInjection;

use Symfony\Component\DependencyInjection\ContainerBuilder;
use Symfony\Component\Config\FileLocator;
use Symfony\Component\HttpKernel\DependencyInjection\Extension;
use Symfony\Component\DependencyInjection\Loader;

/**
 * This is the class that loads and manages your bundle configuration
 *
 * To learn more see {@linkr http://symfony.com/doc/current/cookbook/bundles/extension.html}
 */
class IbrowsSmartAjaxExtension extends Extension
{
    /**
     * {@inheritDoc}
     */
    public function load(array $configs, ContainerBuilder $container)
    {
        $configuration = new Configuration();
        $config = $this->processConfiguration($configuration, $configs);

        if($config['redirect_listener_enabled']){
            $container->setParameter('ibrows_smartajax.redirect_listener_code', $config['redirect_listener_code']);
            $container->setParameter('ibrows_smartajax.redirect_listener_header', $config['redirect_listener_header']);

            $loader = new Loader\XmlFileLoader($container, new FileLocator(__DIR__.'/../Resources/config'));
            $loader->load('listener_service.xml');
        }

    }
}
